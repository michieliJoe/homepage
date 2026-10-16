import { createHash } from "crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

import createMockRes from "test-utils/create-mock-res";

function sha256(input) {
  return createHash("sha256").update(input).digest("hex");
}

const { readFileSync, checkAndCopyConfig, getTabConfigFiles, CONF_DIR } = vi.hoisted(() => ({
  readFileSync: vi.fn(),
  checkAndCopyConfig: vi.fn(),
  getTabConfigFiles: vi.fn(() => []),
  CONF_DIR: "/conf",
}));

vi.mock("fs", () => ({
  readFileSync,
}));

vi.mock("utils/config/config", () => ({
  default: checkAndCopyConfig,
  CONF_DIR,
}));

import handler from "pages/api/hash";

vi.mock("utils/config/tabs", () => ({ getTabConfigFiles }));

describe("pages/api/hash", () => {
  const originalBuildTime = process.env.HOMEPAGE_BUILDTIME;

  beforeEach(() => {
    vi.clearAllMocks();
    getTabConfigFiles.mockReturnValue([]);
    process.env.HOMEPAGE_BUILDTIME = originalBuildTime;
  });

  it("returns a combined sha256 hash of known config files and build time", async () => {
    process.env.HOMEPAGE_BUILDTIME = "build-1";

    // Return deterministic contents based on file name.
    readFileSync.mockImplementation((filePath) => {
      const name = filePath.split("/").pop();
      return `content:${name}`;
    });

    const req = { query: {} };
    const res = createMockRes();

    await handler(req, res);

    const configs = [
      "docker.yaml",
      "settings.yaml",
      "services.yaml",
      "bookmarks.yaml",
      "widgets.yaml",
      "custom.css",
      "custom.js",
    ];
    const hashes = configs.map((c) => sha256(`content:${c}`));
    const expected = sha256(hashes.join("") + "build-1");

    expect(checkAndCopyConfig).toHaveBeenCalled();
    expect(res.body).toEqual({ hash: expected });
  });

  it("changes the hash when tab files are added, edited, or removed", async () => {
    readFileSync.mockReturnValue("original");
    const initial = createMockRes();
    await handler({}, initial);

    getTabConfigFiles.mockReturnValue(["/conf/tabs/slc/services.yaml"]);
    const added = createMockRes();
    await handler({}, added);
    expect(added.body.hash).not.toBe(initial.body.hash);

    readFileSync.mockImplementation((file) => (file.includes("/tabs/") ? "edited" : "original"));
    const edited = createMockRes();
    await handler({}, edited);
    expect(edited.body.hash).not.toBe(added.body.hash);

    getTabConfigFiles.mockReturnValue([]);
    const removed = createMockRes();
    await handler({}, removed);
    expect(removed.body.hash).toBe(initial.body.hash);
  });
});

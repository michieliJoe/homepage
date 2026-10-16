import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getTabConfigFiles, loadTabConfigs } from "./tabs";

describe("per-tab configuration", () => {
  let directory;

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), "homepage-tabs-"));
  });

  afterEach(() => {
    rmSync(directory, { recursive: true, force: true });
  });

  function writeTab(name, files) {
    const tabDirectory = join(directory, "tabs", name);
    mkdirSync(tabDirectory, { recursive: true });
    for (const [file, contents] of Object.entries(files)) writeFileSync(join(tabDirectory, file), contents);
  }

  it("preserves legacy configurations when no tabs directory exists", () => {
    expect(loadTabConfigs(directory)).toEqual([]);
    expect(getTabConfigFiles(directory)).toEqual([]);
  });

  it("exposes optional abbreviations in settings and validates their type", async () => {
    writeFileSync(join(directory, "settings.yaml"), "title: Dashboard");
    writeTab("northview", { "settings.yaml": 'name: Northview\nabbreviation: " NV "' });
    expect(loadTabConfigs(directory)[0].abbreviation).toBe("NV");
    const originalDirectory = process.env.HOMEPAGE_CONFIG_DIR;
    process.env.HOMEPAGE_CONFIG_DIR = directory;
    vi.resetModules();
    try {
      const { getSettings } = await import("./config");
      expect(getSettings().tabAbbreviations).toEqual({ Northview: "NV" });
    } finally {
      if (originalDirectory === undefined) delete process.env.HOMEPAGE_CONFIG_DIR;
      else process.env.HOMEPAGE_CONFIG_DIR = originalDirectory;
      vi.resetModules();
    }
    writeTab("northview", { "settings.yaml": "abbreviation: 42" });
    expect(() => loadTabConfigs(directory)).toThrow("Invalid abbreviation");
    writeTab("northview", { "settings.yaml": 'abbreviation: " "' });
    expect(() => loadTabConfigs(directory)).toThrow("Invalid abbreviation");
  });

  it("loads optional tab button colors and rejects invalid colors", () => {
    writeTab("slc", { "settings.yaml": 'name: SLC\ntabColor: "#176349"' });
    expect(loadTabConfigs(directory)[0].tabColor).toBe("#176349");
    writeTab("slc", { "settings.yaml": "name: SLC\ntabColor: invalid" });
    expect(() => loadTabConfigs(directory)).toThrow("Invalid tabColor");
  });

  it("applies optional card colors to services and bookmarks without affecting other tabs", () => {
    writeTab("slc", {
      "settings.yaml": 'name: SLC\ncardColor: "#e8f2ed"',
      "services.yaml": "- Sites:\n    - Nested:\n        - Website:\n            href: https://example.com",
      "bookmarks.yaml": "- Links:\n    - Docs:\n        - href: https://example.com",
    });
    writeTab("other", {
      "services.yaml": "- Sites:\n    - Website:\n        href: https://example.com",
    });
    const tabs = loadTabConfigs(directory);
    const slc = tabs.find((tab) => tab.name === "SLC");
    expect(slc.layout["tab/slc/Sites"].cardColor).toBe("#e8f2ed");
    expect(slc.layout["tab/slc/Links"].cardColor).toBe("#e8f2ed");
    expect(tabs.find((tab) => tab.name === "other").layout["tab/other/Sites"]).not.toHaveProperty("cardColor");
    writeTab("slc", { "settings.yaml": "cardColor: not-a-color" });
    expect(() => loadTabConfigs(directory)).toThrow("Invalid cardColor");
  });

  it("qualifies identical group names while preserving display names, ordering, and service IDs", () => {
    writeTab("northview", {
      "settings.yaml": "name: Northview\norder: 2",
      "services.yaml":
        "- Environments:\n    - PROD:\n        id: northview-production\n        href: https://example.com",
    });
    writeTab("slc", {
      "settings.yaml": "name: SLC\norder: 1\nlayout:\n  Environments:\n    style: row\n    columns: 3",
      "services.yaml": "- Environments:\n    - PROD:\n        id: slc-production\n        href: https://example.com",
    });
    const tabs = loadTabConfigs(directory);
    expect(tabs.map((tab) => tab.name)).toEqual(["SLC", "Northview"]);
    expect(tabs[0].layout["tab/slc/Environments"]).toEqual({
      tab: "SLC",
      displayName: "Environments",
      style: "row",
      columns: 3,
    });
    expect(tabs[1].layout["tab/northview/Environments"].displayName).toBe("Environments");
    expect(tabs[0].services[0]["tab/slc/Environments"][0].PROD.id).toBe("slc-production");
  });

  it("supports nested sections, bookmarks, layout lists, and environment substitution", () => {
    writeTab("client", {
      "settings.yaml":
        "name: '{{NAME}}'\nlayout:\n  - Sites:\n      style: row\n      Production:\n        displayName: PROD",
      "services.yaml": "- Sites:\n    - Production:\n        - Website:\n            href: https://example.com",
      "bookmarks.yaml": "- Links:\n    - Docs:\n        - href: https://docs.example.com",
    });
    const [tab] = loadTabConfigs(directory, (contents) => contents.replace("{{NAME}}", "Client"));
    expect(tab.layout["tab/client/Sites"]["tab/client/Sites/Production"].displayName).toBe("PROD");
    expect(tab.services[0]["tab/client/Sites"][0]).toHaveProperty("tab/client/Sites/Production");
    expect(tab.bookmarks[0]).toHaveProperty("tab/client/Links");
    expect(tab.bookmarks[0]["tab/client/Links"][0]).toEqual({ Docs: [{ href: "https://docs.example.com" }] });
    expect(getTabConfigFiles(directory)).toHaveLength(3);
  });

  it("rejects ambiguous tab names", () => {
    writeTab("first", { "settings.yaml": "name: My Client" });
    writeTab("second", { "settings.yaml": "name: my-client" });
    expect(() => loadTabConfigs(directory)).toThrow("Tab names must be unique");
  });

  it("loads optional icons into public settings and rejects invalid icon values", async () => {
    writeFileSync(join(directory, "settings.yaml"), "title: Dashboard");
    writeTab("slc", { "settings.yaml": "name: SLC\nicon: /images/slc-logo.png" });
    expect(loadTabConfigs(directory)[0].icon).toBe("/images/slc-logo.png");
    const originalDirectory = process.env.HOMEPAGE_CONFIG_DIR;
    process.env.HOMEPAGE_CONFIG_DIR = directory;
    vi.resetModules();
    try {
      const { getSettings } = await import("./config");
      expect(getSettings().tabIcons).toEqual({ SLC: "/images/slc-logo.png" });
    } finally {
      if (originalDirectory === undefined) delete process.env.HOMEPAGE_CONFIG_DIR;
      else process.env.HOMEPAGE_CONFIG_DIR = originalDirectory;
      vi.resetModules();
    }
    writeTab("slc", { "settings.yaml": "name: SLC\nicon: 42" });
    expect(() => loadTabConfigs(directory)).toThrow("Invalid tab icon");
  });

  it("merges tab files through the public settings, services, and bookmarks loaders", async () => {
    writeFileSync(join(directory, "settings.yaml"), "title: Dashboard\nlayout:\n  Shared:\n    style: row");
    writeFileSync(
      join(directory, "services.yaml"),
      "- Shared:\n    - Legacy:\n        href: https://legacy.example.com",
    );
    writeFileSync(join(directory, "bookmarks.yaml"), "[]");
    writeTab("slc", {
      "settings.yaml": "name: SLC\nlayout:\n  Environments:\n    columns: 3",
      "services.yaml": "- Environments:\n    - PROD:\n        href: https://example.com",
      "bookmarks.yaml": "- Links:\n    - Docs:\n        - href: https://docs.example.com",
    });
    const originalDirectory = process.env.HOMEPAGE_CONFIG_DIR;
    process.env.HOMEPAGE_CONFIG_DIR = directory;
    vi.resetModules();
    try {
      const { getSettings } = await import("./config");
      const { servicesFromConfig } = await import("./service-helpers");
      const { bookmarksResponse } = await import("./api-response");
      expect(getSettings().layout).toMatchObject({
        Shared: { style: "row" },
        "tab/slc/Environments": { tab: "SLC", displayName: "Environments", columns: 3 },
        "tab/slc/Links": { tab: "SLC", displayName: "Links" },
      });
      expect((await servicesFromConfig()).map((group) => group.name)).toEqual(["Shared", "tab/slc/Environments"]);
      expect(await bookmarksResponse()).toEqual([
        { name: "tab/slc/Links", bookmarks: [{ name: "Docs", href: "https://docs.example.com" }] },
      ]);
    } finally {
      if (originalDirectory === undefined) delete process.env.HOMEPAGE_CONFIG_DIR;
      else process.env.HOMEPAGE_CONFIG_DIR = originalDirectory;
      vi.resetModules();
    }
  });
});

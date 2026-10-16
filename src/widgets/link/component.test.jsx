// @vitest-environment jsdom

import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "test-utils/render-with-providers";

import Component from "./component";

vi.mock("utils/proxy/use-widget-api", () => ({
  default: () => {
    throw new Error("Static links must not request API data");
  },
}));

describe("widgets/link/component", () => {
  it("renders only static link text without requesting API data", () => {
    renderWithProviders(
      <Component
        service={{ widget: { type: "link", label: "Open dashboard", href: "https://example.com/dashboard" } }}
      />,
    );
    const link = screen.getByRole("link", { name: "Open dashboard" });
    expect(link).toHaveAttribute("href", "https://example.com/dashboard");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(link).toHaveTextContent(/^Open dashboard$/);
  });

  it.each(["javascript:alert(1)", "//example.com", undefined])("rejects invalid destination %s", (href) => {
    renderWithProviders(<Component service={{ widget: { type: "link", label: "Open", href } }} />, {
      settings: { hideErrors: false },
    });
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("Link widgets require a label and a valid href")).toBeInTheDocument();
  });
});

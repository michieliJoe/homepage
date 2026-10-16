// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TabContext } from "utils/contexts/tab";

import Tab, { slugifyAndEncode } from "./tab";

vi.mock("components/resolvedicon", () => ({
  default: ({ icon, width, height, alt }) => (
    <span data-icon={icon} data-width={width} data-height={height} data-alt={alt} />
  ),
}));

describe("components/tab", () => {
  it.each([
    ["#176349", "#ffffff"],
    ["#eeeeee", "#000000"],
  ])("supports button color %s with contrasting text", (color, text) => {
    render(
      <TabContext.Provider value={{ activeTab: "slc", setActiveTab: vi.fn() }}>
        <Tab tab="SLC" color={color} />
      </TabContext.Provider>,
    );
    const button = screen.getByRole("tab", { name: "SLC" });
    expect(button.style.getPropertyValue("--tab-button-color")).toBe(color);
    expect(button.style.getPropertyValue("--tab-button-text")).toBe(text);
    expect(button).toHaveClass("cursor-pointer");
  });

  it("slugifyAndEncode lowercases and encodes spaces", () => {
    expect(slugifyAndEncode("My Tab")).toBe("my-tab");
    expect(slugifyAndEncode(undefined)).toBe("");
  });

  it("removes custom colors when the tab becomes inactive", () => {
    const setActiveTab = vi.fn();
    const { rerender } = render(
      <TabContext.Provider value={{ activeTab: "slc", setActiveTab }}>
        <Tab tab="SLC" color="#176349" />
      </TabContext.Provider>,
    );
    const button = screen.getByRole("tab", { name: "SLC" });
    expect(button.style.getPropertyValue("--tab-button-color")).toBe("#176349");
    rerender(
      <TabContext.Provider value={{ activeTab: "northview", setActiveTab }}>
        <Tab tab="SLC" color="#176349" />
      </TabContext.Provider>,
    );
    expect(button).toHaveAttribute("aria-selected", "false");
    expect(button.style.getPropertyValue("--tab-button-color")).toBe("");
    expect(button.style.getPropertyValue("--tab-button-text")).toBe("");
    expect(button).toHaveClass("cursor-pointer");
  });

  it("marks the matching tab as selected and updates hash on click", () => {
    const setActiveTab = vi.fn();

    render(
      <TabContext.Provider value={{ activeTab: "my-tab", setActiveTab }}>
        <Tab tab="My Tab" />
      </TabContext.Provider>,
    );

    const btn = screen.getByRole("tab");
    expect(btn.getAttribute("aria-selected")).toBe("true");

    fireEvent.click(btn);
    expect(setActiveTab).toHaveBeenCalledWith("my-tab");
    expect(window.location.hash).toBe("#my-tab");
  });

  it("renders an optional logo without changing the accessible name or selection", () => {
    const setActiveTab = vi.fn();
    render(
      <TabContext.Provider value={{ activeTab: "slc", setActiveTab }}>
        <Tab tab="SLC" icon="/images/slc-logo.png" />
      </TabContext.Provider>,
    );
    const button = screen.getByRole("tab", { name: "SLC" });
    const image = button.querySelector("[data-icon]");
    expect(image).toHaveAttribute("data-icon", "/images/slc-logo.png");
    expect(image).toHaveAttribute("data-width", "24");
    expect(image).toHaveAttribute("data-height", "24");
    expect(image).toHaveAttribute("data-alt", "");
    fireEvent.click(button);
    expect(setActiveTab).toHaveBeenCalledWith("slc");
  });
});

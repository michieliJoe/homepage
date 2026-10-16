// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@headlessui/react", async () => {
  const React = await import("react");
  const { Fragment } = React;

  function Transition({ as: As = Fragment, children }) {
    if (As === Fragment) return <>{children}</>;
    return <As>{children}</As>;
  }

  function Disclosure({ defaultOpen = true, children }) {
    const content = typeof children === "function" ? children({ open: defaultOpen }) : children;
    return <div>{content}</div>;
  }

  function DisclosureButton(props) {
    return <button type="button" {...props} />;
  }

  const DisclosurePanel = React.forwardRef(function DisclosurePanel(props, ref) {
    // HeadlessUI uses a boolean `static` prop; avoid forwarding it to the DOM.
    const { static: _static, ...rest } = props;
    return <div ref={ref} data-testid="disclosure-panel" {...rest} />;
  });

  Disclosure.Button = DisclosureButton;
  Disclosure.Panel = DisclosurePanel;

  return { Disclosure, Transition };
});

vi.mock("components/bookmarks/list", () => ({
  default: function BookmarksListMock({ bookmarks }) {
    return <div data-testid="bookmarks-list">count:{bookmarks?.length ?? 0}</div>;
  },
}));

vi.mock("components/errorboundry", () => ({
  default: function ErrorBoundaryMock({ children }) {
    return <>{children}</>;
  },
}));

vi.mock("components/resolvedicon", () => ({
  default: function ResolvedIconMock() {
    return <div data-testid="resolved-icon" />;
  },
}));

import BookmarksGroup from "./group";

describe("components/bookmarks/group", () => {
  it("sets an inherited card color only when configured", () => {
    const { container, rerender } = render(
      <BookmarksGroup bookmarks={{ name: "Links", bookmarks: [] }} layout={{ cardColor: "#e8f2ed" }} />,
    );
    expect(container.firstChild.style.getPropertyValue("--tab-card-color")).toBe("#e8f2ed");
    expect(container.firstChild).toHaveAttribute("data-card-color", "true");
    rerender(<BookmarksGroup bookmarks={{ name: "Links", bookmarks: [] }} layout={{}} />);
    expect(container.firstChild.style.getPropertyValue("--tab-card-color")).toBe("");
    expect(container.firstChild).not.toHaveAttribute("data-card-color");
  });
  it("uses the configured display name for the heading", () => {
    render(<BookmarksGroup bookmarks={{ name: "slc-links", bookmarks: [] }} layout={{ displayName: "Quick Links" }} />);
    expect(screen.getByRole("heading", { name: "Quick Links" })).toBeInTheDocument();
    expect(screen.queryByText("slc-links")).not.toBeInTheDocument();
  });

  it("renders the group header and list", () => {
    render(
      <BookmarksGroup
        bookmarks={{ name: "Bookmarks", bookmarks: [{ name: "A" }] }}
        layout={{ icon: "mdi:test" }}
        disableCollapse={false}
        groupsInitiallyCollapsed={false}
      />,
    );

    expect(screen.getByText("Bookmarks")).toBeInTheDocument();
    expect(screen.getByTestId("resolved-icon")).toBeInTheDocument();
    expect(screen.getByTestId("bookmarks-list")).toHaveTextContent("count:1");
  });

  it("sets the panel height to 0 when initially collapsed", async () => {
    render(
      <BookmarksGroup
        bookmarks={{ name: "Bookmarks", bookmarks: [] }}
        layout={{ initiallyCollapsed: true }}
        groupsInitiallyCollapsed={false}
      />,
    );

    const panel = screen.getByTestId("disclosure-panel");
    await waitFor(() => {
      expect(panel.style.height).toBe("0px");
    });
  });
});

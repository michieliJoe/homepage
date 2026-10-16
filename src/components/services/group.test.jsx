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
    return <div ref={ref} data-testid="disclosure-panel" {...props} static="true" />;
  });

  Disclosure.Button = DisclosureButton;
  Disclosure.Panel = DisclosurePanel;

  return { Disclosure, Transition };
});

vi.mock("components/resolvedicon", () => ({
  default: function ResolvedIconMock() {
    return <div data-testid="resolved-icon" />;
  },
}));

vi.mock("components/services/list", () => ({
  default: function ServicesListMock({ groupName, services }) {
    return (
      <div data-testid="services-list-mock">
        {groupName}:{services?.length ?? 0}
      </div>
    );
  },
}));

import ServicesGroup from "./group";

describe("components/services/group", () => {
  it("sets an inherited card color only when configured", () => {
    const { container, rerender } = render(
      <ServicesGroup group={{ name: "Sites", services: [], groups: [] }} layout={{ cardColor: "#e8f2ed" }} />,
    );
    expect(container.firstChild.style.getPropertyValue("--tab-card-color")).toBe("#e8f2ed");
    expect(container.firstChild).toHaveAttribute("data-card-color", "true");
    rerender(<ServicesGroup group={{ name: "Sites", services: [], groups: [] }} layout={{}} />);
    expect(container.firstChild.style.getPropertyValue("--tab-card-color")).toBe("");
    expect(container.firstChild).not.toHaveAttribute("data-card-color");
  });
  it("supports identical display names for independently identified groups", () => {
    render(
      <>
        <ServicesGroup
          group={{ name: "slc-environments", services: [], groups: [] }}
          layout={{ tab: "SLC", displayName: "Environments" }}
        />
        <ServicesGroup
          group={{ name: "meridian-environments", services: [], groups: [] }}
          layout={{ tab: "Meridian", displayName: "Environments" }}
        />
      </>,
    );
    expect(screen.getAllByRole("heading", { name: "Environments" })).toHaveLength(2);
    expect(screen.getByText("slc-environments:0")).toBeInTheDocument();
    expect(screen.getByText("meridian-environments:0")).toBeInTheDocument();
  });

  it("displays a custom heading while retaining the group identifier", () => {
    render(
      <ServicesGroup
        group={{ name: "slc-environments", services: [], groups: [] }}
        layout={{ displayName: "Environments" }}
      />,
    );
    expect(screen.getByRole("heading", { name: "Environments" })).toBeInTheDocument();
    expect(screen.getByTestId("services-list-mock")).toHaveTextContent("slc-environments:0");
  });

  it("renders group and subgroup headers", () => {
    render(
      <ServicesGroup
        group={{
          name: "Main",
          services: [{ name: "svc" }],
          groups: [{ name: "Sub", services: [], groups: [] }],
        }}
        layout={{ icon: "mdi:test" }}
        groupsInitiallyCollapsed={false}
      />,
    );

    expect(screen.getByText("Main")).toBeInTheDocument();
    expect(screen.getByTestId("resolved-icon")).toBeInTheDocument();
    const lists = screen.getAllByTestId("services-list-mock");
    expect(lists[0]).toHaveTextContent("Main:1");
    expect(screen.getByText("Sub")).toBeInTheDocument();
  });

  it("sets the panel height to 0 when initially collapsed", async () => {
    render(
      <ServicesGroup
        group={{ name: "Main", services: [], groups: [] }}
        layout={{ initiallyCollapsed: true }}
        groupsInitiallyCollapsed={false}
      />,
    );

    const panel = screen.getAllByTestId("disclosure-panel")[0];
    await waitFor(() => {
      expect(panel.style.height).toBe("0px");
    });
  });
});

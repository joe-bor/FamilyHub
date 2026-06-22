import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Feed } from "@/lib/home-activity/types";
import { ActivityFeed } from "./activity-feed";

const feed: Feed = {
  groups: [
    {
      id: "calendar",
      module: "calendar",
      summary: "Calendar · 2 added",
      newest: 30,
      rowsOverflow: 0,
      rows: [
        {
          storeKey: "calendar:a",
          kind: "added",
          label: "Dentist",
          detail: "Tue 9:00 AM",
          module: "calendar",
          memberId: "m1",
        },
        {
          storeKey: "calendar:b",
          kind: "edited",
          label: "Soccer",
          detail: "5:00 PM",
          module: "calendar",
        },
      ],
    },
    {
      id: "lists:l1",
      module: "lists",
      summary: "Groceries · +3 items",
      newest: 10,
      rowsOverflow: 0,
      rows: [
        {
          storeKey: "lists:l1",
          kind: "edited",
          label: "Groceries",
          detail: "+3 items",
          module: "lists",
          entityId: "l1",
        },
      ],
    },
  ],
  dividerAfter: 0,
  overflow: 0,
};

describe("ActivityFeed", () => {
  it("renders groups + divider; expander toggles aria-expanded and sub-row tabbability", () => {
    render(<ActivityFeed feed={feed} onSelectRow={vi.fn()} />);
    expect(screen.getByText("Calendar · 2 added")).toBeInTheDocument();
    expect(screen.getByText(/earlier/i)).toBeInTheDocument();
    const expander = screen.getByRole("button", { name: /Calendar/ });
    expect(expander).toHaveAttribute("aria-expanded", "false");
    // Sub-rows stay in the DOM (animated collapse) but are not tabbable while collapsed.
    expect(screen.getByText(/Dentist/).closest("button")).toHaveAttribute(
      "tabindex",
      "-1",
    );
    fireEvent.click(expander);
    expect(expander).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(/Dentist/).closest("button")).toHaveAttribute(
      "tabindex",
      "0",
    );
  });

  it("tints a leading member dot when a color resolver is provided", () => {
    render(
      <ActivityFeed
        feed={feed}
        onSelectRow={vi.fn()}
        memberColorOf={(id) => (id === "m1" ? "#ff0000" : undefined)}
      />,
    );
    expect(document.querySelector('span[style*="background"]')).toBeTruthy();
  });

  it("collapses expansion when the meaningful-open epoch changes", () => {
    const { rerender } = render(
      <ActivityFeed feed={feed} onSelectRow={vi.fn()} meaningfulOpenId={1} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Calendar/ }));
    expect(screen.getByRole("button", { name: /Calendar/ })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    rerender(
      <ActivityFeed feed={feed} onSelectRow={vi.fn()} meaningfulOpenId={2} />,
    );
    expect(screen.getByRole("button", { name: /Calendar/ })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("renders the empty state when there are no groups", () => {
    render(
      <ActivityFeed
        feed={{ groups: [], dividerAfter: -1, overflow: 0 }}
        onSelectRow={vi.fn()}
      />,
    );
    expect(screen.getByText(/all caught up/i)).toBeInTheDocument();
  });

  it("fires onSelectRow with the row when a single-row group is clicked", () => {
    const onSelect = vi.fn();
    render(<ActivityFeed feed={feed} onSelectRow={onSelect} />);
    fireEvent.click(screen.getByRole("button", { name: /Groceries/ }));
    expect(onSelect).toHaveBeenCalledWith(feed.groups[1].rows[0]);
  });
});

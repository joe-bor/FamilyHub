import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { createTestEvent, testMembers } from "@/test/fixtures";
import { render, screen, seedFamilyStore } from "@/test/test-utils";
import { MonthDayCell } from "./month-day-cell";

const date = new Date(2026, 2, 8);

function renderCell(
  overrides: Partial<Parameters<typeof MonthDayCell>[0]> = {},
) {
  seedFamilyStore({ name: "Test Family", members: testMembers });
  const props = {
    date,
    visibleMonthName: "March",
    columnIndex: 0,
    plan: { slots: [], overflowCount: 0 },
    allEvents: [],
    memberColors: [],
    memberNames: [],
    isToday: false,
    isFocused: false,
    isOutsideMonth: false,
    isWeekend: false,
    rowHeight: 124,
    onActivateDay: vi.fn(),
    onSelectDay: vi.fn(),
    onEventClick: vi.fn(),
    onFocusDay: vi.fn(),
    onKeyDown: vi.fn(),
    popoverOpen: false,
    onPopoverOpenChange: vi.fn(),
    ...overrides,
  };
  render(<MonthDayCell {...props} />);
  return props;
}

describe("MonthDayCell", () => {
  it("is one gridcell target with no nested controls while closed", () => {
    renderCell();
    const cell = screen.getByRole("gridcell");
    expect(cell).toBeInTheDocument();
    expect(cell.tagName).not.toBe("BUTTON");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("names the day with its event count", () => {
    renderCell({
      plan: {
        slots: [
          {
            kind: "event",
            edge: "solo",
            event: createTestEvent({ id: "a", title: "Soccer", date }),
          },
        ],
        overflowCount: 0,
      },
      allEvents: [createTestEvent({ id: "a", title: "Soccer", date })],
    });
    expect(screen.getByRole("gridcell")).toHaveAccessibleName(
      /March 8, 2026, 1 event/i,
    );
  });

  it("names an empty day as having no events", () => {
    renderCell();
    expect(screen.getByRole("gridcell")).toHaveAccessibleName(
      /March 8, 2026, no events/i,
    );
  });

  it("announces days outside the visible month", () => {
    renderCell({ date: new Date(2026, 1, 26), isOutsideMonth: true });
    const cell = screen.getByRole("gridcell");
    expect(cell).toHaveAccessibleName(
      "February 26, 2026, no events, outside March",
    );
    expect(cell.className).not.toMatch(/opacity/);
    expect(screen.getByText("26")).toHaveClass("text-muted-foreground");
  });

  it("marks today with aria-current", () => {
    renderCell({ isToday: true });
    expect(screen.getByRole("gridcell")).toHaveAttribute(
      "aria-current",
      "date",
    );
  });

  it("carries the roving tabindex only when focused", () => {
    renderCell({ isFocused: true });
    expect(screen.getByRole("gridcell")).toHaveAttribute("tabindex", "0");
  });

  it("takes itself out of the tab order when not focused", () => {
    renderCell();
    expect(screen.getByRole("gridcell")).toHaveAttribute("tabindex", "-1");
  });

  it("summarises members for screen readers instead of relying on title", () => {
    renderCell({
      memberColors: ["coral", "teal"],
      memberNames: ["John", "Jane"],
    });
    expect(screen.getByText("John and Jane have events")).toBeInTheDocument();
    expect(screen.getByRole("gridcell")).toHaveAccessibleDescription(
      "John and Jane have events",
    );
  });

  it("uses singular phrasing for one member", () => {
    renderCell({ memberColors: ["coral"], memberNames: ["John"] });
    expect(screen.getByText("John has events")).toBeInTheDocument();
  });

  it("renders a blank placeholder for a reserved slot", () => {
    renderCell({
      plan: { slots: [{ kind: "blank" }], overflowCount: 0 },
    });
    expect(screen.getByTestId("month-slot-blank")).toHaveStyle({
      height: "28px",
      minHeight: "28px",
    });
  });

  it("renders +N as a fixed visual slot, not a second control", () => {
    renderCell({
      plan: { slots: [], overflowCount: 3 },
      allEvents: [createTestEvent({ id: "a", title: "Soccer", date })],
    });

    expect(
      screen.queryByRole("button", { name: /show all/i }),
    ).not.toBeInTheDocument();
    // maxHeight matters as much as height: `+N more` is one of the slots
    // monthSlotCapacity() counts, so an unclamped box would let the cell
    // render taller than the capacity arithmetic assumed.
    expect(screen.getByTestId("month-overflow-summary")).toHaveStyle({
      height: "28px",
      minHeight: "28px",
      maxHeight: "28px",
    });
  });

  it("delegates the entire cell target to the parent activation policy", async () => {
    const user = userEvent.setup();
    const props = renderCell({
      allEvents: [createTestEvent({ id: "a", title: "Soccer", date })],
    });

    await user.click(screen.getByRole("gridcell"));
    expect(props.onActivateDay).toHaveBeenCalledWith(date);
    expect(props.onFocusDay).toHaveBeenCalledWith(date);
    expect(screen.getByRole("gridcell")).toHaveFocus();
  });

  it("keeps the selected ring visible when the focused day is also today", () => {
    // Spec 4.7 requires today and selected to be separable when they are the
    // same day, so the selected ring must not be suppressed by isToday.
    renderCell({ isToday: true, isFocused: true });
    const cell = screen.getByRole("gridcell");
    expect(cell.className).toMatch(/ring-primary/); // today
    expect(cell.className).toMatch(/outline-ring/); // selected
  });
});

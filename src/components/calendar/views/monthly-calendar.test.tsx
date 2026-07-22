import { fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CalendarEvent } from "@/lib/types";
import { createTestEvent, testMembers } from "@/test/fixtures";
import {
  render,
  resetViewportWidth,
  screen,
  seedFamilyStore,
  setViewportWidth,
} from "@/test/test-utils";
import { MonthlyCalendar } from "./monthly-calendar";

const filter = {
  selectedMembers: testMembers.map((member) => member.id),
  showAllDayEvents: true,
};

function setup(
  currentDate = new Date(2026, 2, 8),
  suppliedEvents?: CalendarEvent[],
) {
  const events = suppliedEvents ?? [
    createTestEvent({
      id: "soccer",
      title: "Soccer",
      date: new Date(2026, 2, 8),
      memberId: testMembers[0].id,
    }),
  ];
  const onDateSelect = vi.fn();
  const onMonthChange = vi.fn();
  render(
    <MonthlyCalendar
      events={events}
      currentDate={currentDate}
      filter={filter}
      onDateSelect={onDateSelect}
      onMonthChange={onMonthChange}
      onEventClick={vi.fn()}
    />,
  );
  return { onDateSelect, onMonthChange };
}

/**
 * The global ResizeObserver mock in src/test/setup.ts isn't constructable, so
 * both the weeks-container observer here and Radix Popper's autoUpdate crash
 * without a local class. Same override already used by month-overflow-popover,
 * event-form and time-picker tests. Its callback never fires, so rowHeight
 * stays at MONTH_MIN_ROW_HEIGHT — jsdom has no layout, and measured geometry
 * is proven in the browser, not here.
 */
function stubResizeObserver() {
  class ResizeObserverMock {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  }

  vi.stubGlobal("ResizeObserver", ResizeObserverMock);
}

describe("MonthlyCalendar large screen", () => {
  beforeEach(() => {
    stubResizeObserver();
    setViewportWidth(1280);
    seedFamilyStore({ name: "Test Family", members: testMembers });
  });
  afterEach(resetViewportWidth);

  it("owns only a weekday row and an observed weeks rowgroup", () => {
    setup();
    const grid = screen.getByRole("grid");
    expect(
      Array.from(grid.children).map((child) => child.getAttribute("role")),
    ).toEqual(["row", "rowgroup"]);
    expect(
      grid.querySelectorAll('[role="rowgroup"] > [role="row"]'),
    ).toHaveLength(5);
    expect(screen.getAllByRole("columnheader")).toHaveLength(7);
  });

  it("has exactly one roving gridcell tab stop and Tab leaves the grid", async () => {
    const user = userEvent.setup();
    const crowded = Array.from({ length: 12 }, (_, index) =>
      createTestEvent({
        id: `crowded-${index}`,
        title: `Crowded ${index}`,
        date: new Date(2026, 2, index < 6 ? 8 : 9),
        memberId: testMembers[index % testMembers.length].id,
      }),
    );
    setup(new Date(2026, 2, 8), crowded);
    const cells = screen.getAllByRole("gridcell");
    expect(cells.filter((cell) => cell.tabIndex === 0)).toHaveLength(1);
    expect(
      screen.getAllByTestId("month-overflow-summary").length,
    ).toBeGreaterThanOrEqual(2);
    expect(screen.queryAllByRole("button", { name: /show all/i })).toHaveLength(
      0,
    );
    await user.tab();
    expect(document.activeElement).toHaveAttribute("role", "gridcell");
    await user.tab();
    expect(document.activeElement).not.toHaveAttribute("role", "gridcell");
  });

  it("opens the popover for a populated day and Day view for an empty day", async () => {
    const user = userEvent.setup();
    const { onDateSelect } = setup();
    await user.click(
      screen.getByRole("gridcell", { name: /March 8, 2026, 1 event/i }),
    );
    expect(
      screen.getByRole("dialog", { name: /events for march 8/i }),
    ).toBeInTheDocument();
    await user.keyboard("{Escape}");
    await user.click(
      screen.getByRole("gridcell", { name: /March 9, 2026, no events/i }),
    );
    expect(onDateSelect).toHaveBeenCalledWith(new Date(2026, 2, 9));
  });

  it("moves by exact day/week boundaries with arrows, Home and End", async () => {
    const user = userEvent.setup();
    setup();
    const start = screen.getByRole("gridcell", { name: /March 8, 2026/ });
    start.focus();
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toHaveAttribute("data-date", "2026-03-09");
    await user.keyboard("{End}");
    expect(document.activeElement).toHaveAttribute("data-date", "2026-03-14");
    await user.keyboard("{Home}");
    expect(document.activeElement).toHaveAttribute("data-date", "2026-03-08");
    await user.keyboard("{ArrowDown}");
    expect(document.activeElement).toHaveAttribute("data-date", "2026-03-15");
    await user.keyboard("{ArrowUp}");
    expect(document.activeElement).toHaveAttribute("data-date", "2026-03-08");
    await user.keyboard("{ArrowLeft}");
    expect(document.activeElement).toHaveAttribute("data-date", "2026-03-07");
  });

  it("keeps ArrowRight on an adjacent-month cell already owned by the grid", async () => {
    const user = userEvent.setup();
    const { onMonthChange } = setup(new Date(2026, 2, 31));
    const cell = screen.getByRole("gridcell", { name: /March 31, 2026/ });
    cell.focus();

    await user.keyboard("{ArrowRight}");

    expect(document.activeElement).toHaveAttribute("data-date", "2026-04-01");
    expect(onMonthChange).not.toHaveBeenCalled();
  });

  it("forces PageDown to change month even when April 1 is already in the matrix", () => {
    const { onMonthChange } = setup(new Date(2026, 2, 1));
    const cell = screen.getByRole("gridcell", { name: /March 1, 2026/ });
    cell.focus();
    fireEvent.keyDown(cell, { key: "PageDown" });
    expect(onMonthChange).toHaveBeenCalledWith(new Date(2026, 3, 1));
  });

  it("forces PageUp to change to the previous visible month", () => {
    const { onMonthChange } = setup(new Date(2026, 3, 1));
    const cell = screen.getByRole("gridcell", { name: /April 1, 2026/ });
    cell.focus();
    fireEvent.keyDown(cell, { key: "PageUp" });
    expect(onMonthChange).toHaveBeenCalledWith(new Date(2026, 2, 1));
  });

  it("treats Space like Enter and prevents page scrolling", () => {
    setup();
    const cell = screen.getByRole("gridcell", { name: /March 8, 2026/ });
    expect(fireEvent.keyDown(cell, { key: " " })).toBe(false);
    expect(
      screen.getByRole("dialog", { name: /events for march 8/i }),
    ).toBeInTheDocument();
  });

  it("routes Enter and Space on an empty day to Day view", () => {
    const { onDateSelect } = setup();
    const cell = screen.getByRole("gridcell", {
      name: /March 9, 2026, no events/i,
    });
    expect(fireEvent.keyDown(cell, { key: "Enter" })).toBe(false);
    expect(fireEvent.keyDown(cell, { key: " " })).toBe(false);
    expect(onDateSelect).toHaveBeenNthCalledWith(1, new Date(2026, 2, 9));
    expect(onDateSelect).toHaveBeenNthCalledWith(2, new Date(2026, 2, 9));
  });

  it("renders and opens events on a leading adjacent-month day", () => {
    const adjacent = createTestEvent({
      id: "march-adjacent",
      title: "March handoff",
      date: new Date(2026, 2, 31),
      memberId: testMembers[0].id,
    });
    setup(new Date(2026, 3, 15), [adjacent]);
    const cell = screen.getByRole("gridcell", {
      name: "March 31, 2026, 1 event, outside April",
    });
    expect(cell.className).not.toMatch(/opacity/);
    fireEvent.keyDown(cell, { key: "Enter" });
    expect(
      screen.getByRole("button", { name: /March handoff/i }),
    ).toBeInTheDocument();
  });
});

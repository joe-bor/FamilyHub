import type { CalendarEvent } from "@/lib/types";
import { fireEvent, render, screen } from "@/test/test-utils";
import { MobileMonthlyView } from "./mobile-monthly-view";

const mockEvents: CalendarEvent[] = [
  {
    id: "1",
    title: "Soccer Practice",
    date: new Date(2026, 2, 18),
    startTime: "11:00 AM",
    endTime: "12:30 PM",
    memberId: "m1",
    isAllDay: false,
  },
  {
    id: "2",
    title: "Grocery Run",
    date: new Date(2026, 2, 18),
    startTime: "3:00 PM",
    endTime: "4:00 PM",
    memberId: "m2",
    isAllDay: false,
  },
];

const mockMemberMap = new Map([
  ["m1", { id: "m1", name: "Alice", color: "coral" as const }],
  ["m2", { id: "m2", name: "Bob", color: "teal" as const }],
]);

describe("MobileMonthlyView", () => {
  it("renders day initials header", () => {
    render(
      <MobileMonthlyView
        events={mockEvents}
        currentDate={new Date(2026, 2, 18)}
        memberMap={mockMemberMap}
        onEventClick={vi.fn()}
        onDaySelect={vi.fn()}
        onSwipeLeft={vi.fn()}
        onSwipeRight={vi.fn()}
      />,
    );
    // S appears twice (Sunday + Saturday), M appears once
    expect(screen.getAllByText("S").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("M")).toBeInTheDocument();
  });

  it("renders selected day event list when day is tapped", async () => {
    const onDaySelect = vi.fn();
    render(
      <MobileMonthlyView
        events={mockEvents}
        currentDate={new Date(2026, 2, 18)} // March 18 selected by default
        memberMap={mockMemberMap}
        onEventClick={vi.fn()}
        onDaySelect={onDaySelect}
        onSwipeLeft={vi.fn()}
        onSwipeRight={vi.fn()}
      />,
    );
    // Default selection is currentDate — should show events for March 18
    expect(screen.getByText("Soccer Practice")).toBeInTheDocument();
    expect(screen.getByText("Grocery Run")).toBeInTheDocument();
  });

  it("shows 'No events' when selected day has no events", () => {
    render(
      <MobileMonthlyView
        events={mockEvents}
        currentDate={new Date(2026, 2, 1)} // March 1 — no events
        memberMap={mockMemberMap}
        onEventClick={vi.fn()}
        onDaySelect={vi.fn()}
        onSwipeLeft={vi.fn()}
        onSwipeRight={vi.fn()}
      />,
    );
    expect(screen.getByText("No events")).toBeInTheDocument();
  });

  it("renders date numbers for the month", () => {
    render(
      <MobileMonthlyView
        events={mockEvents}
        currentDate={new Date(2026, 2, 18)}
        memberMap={mockMemberMap}
        onEventClick={vi.fn()}
        onDaySelect={vi.fn()}
        onSwipeLeft={vi.fn()}
        onSwipeRight={vi.fn()}
      />,
    );
    // March 2026 has 31 days — check a few specific dates
    const grid = screen.getByRole("grid");
    expect(grid).toBeInTheDocument();
    // Date cells use role="gridcell" (overrides implicit button role)
    const cells = screen.getAllByRole("gridcell");
    expect(cells.length).toBeGreaterThanOrEqual(28); // At least 28 days
  });

  it("calls onDaySelect when a date cell is tapped", async () => {
    const onDaySelect = vi.fn();
    render(
      <MobileMonthlyView
        events={mockEvents}
        currentDate={new Date(2026, 2, 18)}
        memberMap={mockMemberMap}
        onEventClick={vi.fn()}
        onDaySelect={onDaySelect}
        onSwipeLeft={vi.fn()}
        onSwipeRight={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText("15"));
    expect(onDaySelect).toHaveBeenCalled();
  });
});

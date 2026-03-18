import type { CalendarEvent } from "@/lib/types";
import { fireEvent, render, screen } from "@/test/test-utils";
import { MobileWeeklyView } from "./mobile-weekly-view";

const mockEvents: CalendarEvent[] = [
  {
    id: "1",
    title: "Team Standup",
    date: new Date(2026, 2, 16),
    startTime: "9:00 AM",
    endTime: "9:30 AM",
    memberId: "m1",
    isAllDay: false,
  },
  {
    id: "2",
    title: "Soccer Practice",
    date: new Date(2026, 2, 18),
    startTime: "11:00 AM",
    endTime: "12:30 PM",
    memberId: "m2",
    isAllDay: false,
  },
];

const mockMemberMap = new Map([
  ["m1", { id: "m1", name: "Alice", color: "coral" as const }],
  ["m2", { id: "m2", name: "Bob", color: "teal" as const }],
]);

describe("MobileWeeklyView", () => {
  it("renders week date strip with day initials", () => {
    render(
      <MobileWeeklyView
        events={mockEvents}
        currentDate={new Date(2026, 2, 18)}
        memberMap={mockMemberMap}
        onEventClick={vi.fn()}
        onDayClick={vi.fn()}
        onSwipeLeft={vi.fn()}
        onSwipeRight={vi.fn()}
      />,
    );
    // Should show 7 day columns in the date strip
    const dateStrip = screen.getByRole("navigation", { name: /week/i });
    expect(dateStrip).toBeInTheDocument();
    // Check that date numbers for the week are rendered (Mar 15-21, 2026 week containing Mar 18)
    // "18" appears in both the date strip and the day list, so use getAllByText
    expect(screen.getAllByText("18").length).toBeGreaterThan(0);
  });

  it("renders events grouped by day", () => {
    render(
      <MobileWeeklyView
        events={mockEvents}
        currentDate={new Date(2026, 2, 18)}
        memberMap={mockMemberMap}
        onEventClick={vi.fn()}
        onDayClick={vi.fn()}
        onSwipeLeft={vi.fn()}
        onSwipeRight={vi.fn()}
      />,
    );
    expect(screen.getByText("Team Standup")).toBeInTheDocument();
    expect(screen.getByText("Soccer Practice")).toBeInTheDocument();
  });

  it("shows 'No events' for empty days", () => {
    render(
      <MobileWeeklyView
        events={[]} // No events this week
        currentDate={new Date(2026, 2, 18)}
        memberMap={mockMemberMap}
        onEventClick={vi.fn()}
        onDayClick={vi.fn()}
        onSwipeLeft={vi.fn()}
        onSwipeRight={vi.fn()}
      />,
    );
    // At least one day should show "No events"
    expect(screen.getAllByText("No events").length).toBeGreaterThan(0);
  });

  it("highlights today in the date strip", () => {
    // Use a fixed "today" by mocking Date
    const fixedDate = new Date(2026, 2, 18);
    vi.setSystemTime(fixedDate);
    render(
      <MobileWeeklyView
        events={[]}
        currentDate={fixedDate}
        memberMap={mockMemberMap}
        onEventClick={vi.fn()}
        onDayClick={vi.fn()}
        onSwipeLeft={vi.fn()}
        onSwipeRight={vi.fn()}
      />,
    );
    expect(screen.getByText(/today/i)).toBeInTheDocument();
    vi.useRealTimers();
  });

  it("calls onDayClick when day label is tapped", async () => {
    const onDayClick = vi.fn();
    render(
      <MobileWeeklyView
        events={mockEvents}
        currentDate={new Date(2026, 2, 18)}
        memberMap={mockMemberMap}
        onEventClick={vi.fn()}
        onDayClick={onDayClick}
        onSwipeLeft={vi.fn()}
        onSwipeRight={vi.fn()}
      />,
    );
    // Click on a day label (the day number)
    const dayButtons = screen.getAllByRole("button", { name: /view day/i });
    fireEvent.click(dayButtons[0]);
    expect(onDayClick).toHaveBeenCalled();
  });
});

import type { CalendarEvent } from "@/lib/types";
import { fireEvent, render, screen } from "@/test/test-utils";
import { MobileDailyView } from "./mobile-daily-view";

const mockEvents: CalendarEvent[] = [
  {
    id: "1",
    title: "Team Standup",
    date: new Date(2026, 2, 18),
    startTime: "9:00 AM",
    endTime: "9:30 AM",
    memberId: "m1",
    isAllDay: false,
  },
  {
    id: "2",
    title: "Lunch",
    date: new Date(2026, 2, 18),
    startTime: "12:00 PM",
    endTime: "1:00 PM",
    memberId: "m2",
    isAllDay: false,
  },
];

const mockMemberMap = new Map([
  ["m1", { id: "m1", name: "Alice", color: "coral" as const }],
  ["m2", { id: "m2", name: "Bob", color: "teal" as const }],
]);

describe("MobileDailyView", () => {
  it("renders time labels", () => {
    render(
      <MobileDailyView
        events={mockEvents}
        currentDate={new Date(2026, 2, 18)}
        memberMap={mockMemberMap}
        onEventClick={vi.fn()}
        onSwipeLeft={vi.fn()}
        onSwipeRight={vi.fn()}
      />,
    );
    // Even hours only on mobile
    expect(screen.getByText("8 AM")).toBeInTheDocument();
    expect(screen.getByText("10 AM")).toBeInTheDocument();
  });

  it("renders event titles", () => {
    render(
      <MobileDailyView
        events={mockEvents}
        currentDate={new Date(2026, 2, 18)}
        memberMap={mockMemberMap}
        onEventClick={vi.fn()}
        onSwipeLeft={vi.fn()}
        onSwipeRight={vi.fn()}
      />,
    );
    expect(screen.getByText("Team Standup")).toBeInTheDocument();
    expect(screen.getByText("Lunch")).toBeInTheDocument();
  });

  it("calls onEventClick when event is tapped", async () => {
    const onEventClick = vi.fn();
    render(
      <MobileDailyView
        events={mockEvents}
        currentDate={new Date(2026, 2, 18)}
        memberMap={mockMemberMap}
        onEventClick={onEventClick}
        onSwipeLeft={vi.fn()}
        onSwipeRight={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText("Team Standup"));
    expect(onEventClick).toHaveBeenCalledWith(mockEvents[0]);
  });

  it("wraps content in SwipeContainer", () => {
    const onSwipeLeft = vi.fn();
    const { container } = render(
      <MobileDailyView
        events={mockEvents}
        currentDate={new Date(2026, 2, 18)}
        memberMap={mockMemberMap}
        onEventClick={vi.fn()}
        onSwipeLeft={onSwipeLeft}
        onSwipeRight={vi.fn()}
      />,
    );
    // SwipeContainer applies touch-action: pan-y via inline style property
    // jsdom does not serialize touchAction to the style attribute string,
    // so we check the element's inline style property directly.
    const swipeEl = container.firstChild as HTMLElement;
    expect(swipeEl.style.touchAction).toBe("pan-y");
  });
});

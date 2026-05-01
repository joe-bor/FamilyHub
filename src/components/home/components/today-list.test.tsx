import type { CalendarEvent } from "@/lib/types";
import { testMembers } from "@/test/fixtures";
import { renderWithUser, screen } from "@/test/test-utils";
import { TodayList } from "./today-list";

function createEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: "event-1",
    title: "Soccer practice",
    startTime: "2:00 PM",
    endTime: "3:00 PM",
    date: new Date(2026, 3, 25),
    memberId: testMembers[0].id,
    isAllDay: false,
    source: "NATIVE",
    ...overrides,
  };
}

describe("TodayList", () => {
  const currentDate = new Date(2026, 3, 25, 12, 0, 0, 0);

  it("pins all-day events to the top, excludes the hero event, and shows multi-day affixes", () => {
    renderWithUser(
      <TodayList
        currentDate={currentDate}
        events={[
          createEvent({
            id: "hero-event",
            title: "Hero event",
            startTime: "10:00 AM",
            endTime: "11:00 AM",
          }),
          createEvent({
            id: "all-day",
            title: "Vacation",
            isAllDay: true,
            startTime: "00:00",
            endTime: "23:59",
            date: new Date(2026, 3, 25),
            endDate: new Date(2026, 3, 27),
          }),
          createEvent({
            id: "last-day",
            title: "Conference",
            isAllDay: true,
            startTime: "00:00",
            endTime: "23:59",
            date: new Date(2026, 3, 23),
            endDate: new Date(2026, 3, 25),
          }),
          createEvent({
            id: "timed-event",
            title: "Pickup",
            startTime: "4:00 PM",
            endTime: "5:00 PM",
          }),
        ]}
        members={testMembers}
        excludeKey="hero-event"
        onSelect={vi.fn()}
      />,
    );

    expect(screen.queryByText("Hero event")).not.toBeInTheDocument();
    expect(
      screen
        .getAllByRole("button")
        .slice(0, 2)
        .map((button) => button.textContent ?? ""),
    ).toEqual(
      expect.arrayContaining(["Vacation→ ends Mon", "Conferencefrom Thu →"]),
    );
    expect(screen.getByText("→ ends Mon")).toBeInTheDocument();
    expect(screen.getByText("from Thu →")).toBeInTheDocument();
    expect(screen.getByText("4:00 PM")).toBeInTheDocument();
  });

  it("calls onSelect when a row is tapped", async () => {
    const event = createEvent();
    const onSelect = vi.fn();
    const { user } = renderWithUser(
      <TodayList
        currentDate={currentDate}
        events={[event]}
        members={testMembers}
        onSelect={onSelect}
      />,
    );

    await user.click(screen.getByRole("button", { name: /soccer practice/i }));

    expect(onSelect).toHaveBeenCalledWith(event);
  });

  it("renders nothing when there are no events", () => {
    const { container } = renderWithUser(
      <TodayList
        currentDate={currentDate}
        events={[]}
        members={testMembers}
        onSelect={vi.fn()}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});

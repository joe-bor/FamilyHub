import type { CalendarEvent } from "@/lib/types";
import { testMembers } from "@/test/fixtures";
import { renderWithUser, screen } from "@/test/test-utils";
import { ComingUp } from "./coming-up";

function createEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: "event-1",
    title: "Dentist",
    startTime: "9:00 AM",
    endTime: "10:00 AM",
    date: new Date(2026, 3, 26),
    memberId: testMembers[0].id,
    isAllDay: false,
    source: "NATIVE",
    ...overrides,
  };
}

describe("ComingUp", () => {
  const currentDate = new Date(2026, 3, 25, 12, 0, 0, 0);

  it("returns nothing when there are no upcoming events", () => {
    const { container } = renderWithUser(
      <ComingUp
        currentDate={currentDate}
        events={[]}
        members={testMembers}
        onSelect={vi.fn()}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("renders at most three upcoming rows and labels tomorrow distinctly", () => {
    renderWithUser(
      <ComingUp
        currentDate={currentDate}
        events={[
          createEvent({ id: "tomorrow", date: new Date(2026, 3, 26) }),
          createEvent({
            id: "sunday",
            title: "Brunch",
            date: new Date(2026, 3, 27),
          }),
          createEvent({
            id: "monday",
            title: "Class",
            date: new Date(2026, 3, 27),
            startTime: "2:00 PM",
            endTime: "3:00 PM",
          }),
          createEvent({
            id: "hidden-fourth",
            title: "Should be capped",
            date: new Date(2026, 3, 27),
            startTime: "4:00 PM",
            endTime: "5:00 PM",
          }),
        ]}
        members={testMembers}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByText("Coming up")).toBeInTheDocument();
    expect(screen.getByText("Tomorrow")).toBeInTheDocument();
    expect(screen.getAllByText("Mon")).toHaveLength(2);
    expect(screen.queryByText("Should be capped")).not.toBeInTheDocument();
  });

  it("calls onSelect when a row is tapped", async () => {
    const event = createEvent();
    const onSelect = vi.fn();
    const { user } = renderWithUser(
      <ComingUp
        currentDate={currentDate}
        events={[event]}
        members={testMembers}
        onSelect={onSelect}
      />,
    );

    await user.click(screen.getByRole("button", { name: /dentist/i }));

    expect(onSelect).toHaveBeenCalledWith(event);
  });
});

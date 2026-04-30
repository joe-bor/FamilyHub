import type { CalendarEvent } from "@/lib/types";
import { testMember } from "@/test/fixtures";
import { render, renderWithUser, screen } from "@/test/test-utils";
import type { HeroState } from "../lib/hero-state";
import { HeroCard } from "./hero-card";

function createEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: "event-1",
    title: "Soccer practice",
    startTime: "9:00 AM",
    endTime: "9:30 AM",
    date: new Date(2026, 3, 25),
    memberId: testMember.id,
    isAllDay: false,
    location: "Field 2",
    source: "NATIVE",
    ...overrides,
  };
}

describe("HeroCard", () => {
  const now = new Date(2026, 3, 25, 9, 8, 0, 0);

  it("renders the RIGHT_NOW state with an accent and live dot", () => {
    const event = createEvent();

    render(
      <HeroCard
        state={{ kind: "RIGHT_NOW", event }}
        member={testMember}
        now={now}
      />,
    );

    expect(screen.getByText("Now · ends in 22 min")).toBeInTheDocument();
    expect(screen.getByText("Soccer practice")).toBeInTheDocument();
    expect(screen.getByText("Field 2")).toBeInTheDocument();
    expect(screen.getByTestId("hero-accent")).toBeInTheDocument();
    expect(screen.getByTestId("hero-live-dot")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Right now: Soccer practice, ends in 22 min"),
    ).toBeInTheDocument();
  });

  it("renders the UP_NEXT state", () => {
    const event = createEvent({
      startTime: "9:46 AM",
      endTime: "10:30 AM",
    });

    render(
      <HeroCard
        state={{ kind: "UP_NEXT", event }}
        member={testMember}
        now={now}
      />,
    );

    expect(screen.getByText("Up next · in 38 min")).toBeInTheDocument();
  });

  it("renders the ALL_DAY_ONLY state", () => {
    const event = createEvent({
      isAllDay: true,
      startTime: "00:00",
      endTime: "23:59",
      title: "Family trip",
    });

    render(
      <HeroCard
        state={{ kind: "ALL_DAY_ONLY", event }}
        member={testMember}
        now={now}
      />,
    );

    expect(screen.getByText("Today")).toBeInTheDocument();
    expect(screen.getByText("Family trip")).toBeInTheDocument();
  });

  it.each([
    [
      { kind: "REST_OF_DAY_CLEAR" } as HeroState,
      "All clear for the rest of today",
    ],
    [{ kind: "ALL_CLEAR_TODAY" } as HeroState, "Nothing on the calendar today"],
  ])("renders the calm empty state %s", (state, copy) => {
    render(<HeroCard state={state} member={testMember} now={now} />);

    expect(screen.getByText(copy)).toBeInTheDocument();
    expect(screen.queryByTestId("hero-accent")).not.toBeInTheDocument();
  });

  it("only fires onTap for event-backed states", async () => {
    const onTap = vi.fn();
    const { user, rerender } = renderWithUser(
      <HeroCard
        state={{ kind: "RIGHT_NOW", event: createEvent() }}
        member={testMember}
        now={now}
        onTap={onTap}
      />,
    );

    await user.click(screen.getByRole("button", { name: /right now/i }));

    rerender(
      <HeroCard
        state={{ kind: "ALL_CLEAR_TODAY" }}
        member={testMember}
        now={now}
        onTap={onTap}
      />,
    );
    await user.click(screen.getByLabelText("All clear today"));

    expect(onTap).toHaveBeenCalledTimes(1);
  });
});

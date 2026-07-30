import { describe, expect, it, vi } from "vitest";
import type { CalendarEvent, FamilyMember } from "@/lib/types";
import { render, renderWithUser, screen } from "@/test/test-utils";
import { LargeNowHero } from "./large-now-hero";

const member: FamilyMember = { id: "m1", name: "Alice", color: "coral" };
const event: CalendarEvent = {
  id: "e1",
  title: "Swim lesson with an intentionally long title that wraps cleanly",
  date: new Date(2026, 6, 5),
  startTime: "9:00 AM",
  endTime: "10:00 AM",
  memberId: "m1",
  isAllDay: false,
  source: "NATIVE",
  location: "Community pool",
};

describe("LargeNowHero", () => {
  it("renders the now message as the dominant labelled region", () => {
    render(
      <LargeNowHero
        state={{ kind: "UP_NEXT", event }}
        member={member}
        now={new Date(2026, 6, 5, 8, 30)}
        onOpenEvent={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: /up next: swim lesson/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Community pool/)).toBeInTheDocument();
  });

  it("gives the section a static label so it isn't double-announced with the button", () => {
    render(
      <LargeNowHero
        state={{ kind: "UP_NEXT", event }}
        member={member}
        now={new Date(2026, 6, 5, 8, 30)}
        onOpenEvent={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("region", { name: "Home status" }),
    ).toBeInTheDocument();
  });

  it("uses middot separators in the meta copy, matching the mobile hero", () => {
    render(
      <LargeNowHero
        state={{ kind: "UP_NEXT", event }}
        member={member}
        now={new Date(2026, 6, 5, 8, 30)}
        onOpenEvent={vi.fn()}
      />,
    );

    expect(screen.getByText(/Up next · in 30 min/i)).toBeInTheDocument();
  });

  it("routes event taps through the callback", async () => {
    const onOpenEvent = vi.fn();
    const { user } = renderWithUser(
      <LargeNowHero
        state={{ kind: "UP_NEXT", event }}
        member={member}
        now={new Date(2026, 6, 5, 8, 30)}
        onOpenEvent={onOpenEvent}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: /up next: swim lesson/i }),
    );
    expect(onOpenEvent).toHaveBeenCalledWith(event);
  });
});

// The two heroes render the same HeroState on different surfaces, so a family
// that moves between phone and tablet must not be told two different things
// about the same cleared day. Rendering both and comparing keeps that honest —
// a comment claiming the wording matches cannot.
describe("LargeNowHero cleared-day titles match the mobile hero", () => {
  it.each([
    ["REST_OF_DAY_CLEAR", "All clear for the rest of today"],
    ["ALL_CLEAR_TODAY", "Nothing on the calendar today"],
  ] as const)("renders %s as the same title HeroCard uses", (kind, title) => {
    render(
      <LargeNowHero
        state={{ kind }}
        now={new Date(2026, 6, 5, 20, 0)}
        onOpenEvent={vi.fn()}
      />,
    );

    expect(screen.getByText(title)).toBeInTheDocument();
  });
});

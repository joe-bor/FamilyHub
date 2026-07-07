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

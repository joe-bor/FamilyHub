import userEvent from "@testing-library/user-event";
import { addDays } from "date-fns";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { colorMap } from "@/lib/types";
import { createTestEvent, testEvents, testMembers } from "@/test/fixtures";
import {
  render,
  resetFamilyStore,
  resetViewportWidth,
  screen,
  seedFamilyStore,
  setViewportWidth,
  within,
} from "@/test/test-utils";
import { ScheduleCalendar } from "./schedule-calendar";

const defaultFilter = {
  selectedMembers: testMembers.map((m) => m.id),
  showAllDayEvents: true,
};

const expectedBottomPadding =
  "max(8.5rem, calc(env(safe-area-inset-bottom) + 8.5rem))";

function setMobile(isMobile: boolean) {
  setViewportWidth(isMobile ? 390 : 1024);
}

/** jsdom reports resolved colours as `rgb(r, g, b)`, never as the source hex. */
function hexToRgb(hex: string): string {
  const channels = hex.replace("#", "").match(/[0-9a-f]{2}/gi);
  if (channels?.length !== 3) throw new Error(`Invalid hex: ${hex}`);
  const [red, green, blue] = channels.map((c) => Number.parseInt(c, 16));
  return `rgb(${red}, ${green}, ${blue})`;
}

describe("ScheduleCalendar", () => {
  beforeEach(() => {
    seedFamilyStore({
      name: "Test Family",
      members: testMembers,
    });
  });

  afterEach(() => {
    resetFamilyStore();
    resetViewportWidth();
    vi.useRealTimers();
  });

  describe("compact", () => {
    beforeEach(() => setViewportWidth(390));
    afterEach(resetViewportWidth);

    it("renders member avatar initial on event cards", () => {
      // testEvents[0] belongs to testMembers[0] ("John", coral)
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      render(
        <ScheduleCalendar
          events={[testEvents[0]]}
          currentDate={today}
          filter={defaultFilter}
        />,
      );

      // MemberAvatar renders the first initial of the member's name
      const initial = testMembers[0].name.charAt(0).toUpperCase();
      expect(screen.getByText(initial)).toBeInTheDocument();
    });

    it("uses 'Today — Wed, Mar 18' format for today header", () => {
      // Pin "today" to a known Wednesday: 2026-03-18
      const fakeToday = new Date(2026, 2, 18, 12, 0, 0); // March 18, 2026 (Wed)
      vi.useFakeTimers();
      vi.setSystemTime(fakeToday);

      const eventToday = {
        id: "today-event",
        title: "Today Event",
        startTime: "9:00 AM",
        endTime: "10:00 AM",
        date: new Date(2026, 2, 18),
        memberId: testMembers[0].id,
        isAllDay: false,
      };

      render(
        <ScheduleCalendar
          events={[eventToday]}
          currentDate={new Date(2026, 2, 18)}
          filter={defaultFilter}
        />,
      );

      expect(screen.getByText("Today — Wed, Mar 18")).toBeInTheDocument();
    });

    it("uses 'Tomorrow — Thu, Mar 19' format for tomorrow header", () => {
      // Pin "today" to Wednesday Mar 18 so tomorrow is Thursday Mar 19
      const fakeToday = new Date(2026, 2, 18, 12, 0, 0);
      vi.useFakeTimers();
      vi.setSystemTime(fakeToday);

      const eventTomorrow = {
        id: "tomorrow-event",
        title: "Tomorrow Event",
        startTime: "10:00 AM",
        endTime: "11:00 AM",
        date: new Date(2026, 2, 19),
        memberId: testMembers[0].id,
        isAllDay: false,
      };

      render(
        <ScheduleCalendar
          events={[eventTomorrow]}
          currentDate={new Date(2026, 2, 18)}
          filter={defaultFilter}
        />,
      );

      expect(screen.getByText("Tomorrow — Thu, Mar 19")).toBeInTheDocument();
    });

    it("uses full weekday name for other dates", () => {
      // Pin today to Mar 18 so Mar 20 (Friday) is "other"
      const fakeToday = new Date(2026, 2, 18, 12, 0, 0);
      vi.useFakeTimers();
      vi.setSystemTime(fakeToday);

      const futureEvent = {
        id: "future-event",
        title: "Future Event",
        startTime: "2:00 PM",
        endTime: "3:00 PM",
        date: new Date(2026, 2, 20), // Friday
        memberId: testMembers[0].id,
        isAllDay: false,
      };

      render(
        <ScheduleCalendar
          events={[futureEvent]}
          currentDate={new Date(2026, 2, 18)}
          filter={defaultFilter}
        />,
      );

      expect(screen.getByText("Friday, Mar 20")).toBeInTheDocument();
    });

    it("shows 'No upcoming events' when there are no events in the next 14 days", () => {
      render(
        <ScheduleCalendar
          events={[]}
          currentDate={new Date()}
          filter={defaultFilter}
        />,
      );

      expect(screen.getByText("No upcoming events")).toBeInTheDocument();
    });

    it("filters events by selectedMembers", () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      render(
        <ScheduleCalendar
          events={testEvents}
          currentDate={today}
          filter={{
            selectedMembers: [testMembers[0].id], // Only first member
            showAllDayEvents: true,
          }}
        />,
      );

      // testEvents[0] belongs to member-1 (John) — should appear
      expect(screen.getByText("Morning Meeting")).toBeInTheDocument();

      // testEvents[1] belongs to member-2 (Jane) — should NOT appear
      expect(screen.queryByText("Lunch with Team")).not.toBeInTheDocument();
    });

    it("reserves bottom clearance on mobile for the floating action button", () => {
      setMobile(true);

      const { container } = render(
        <ScheduleCalendar
          events={testEvents}
          currentDate={new Date(2026, 2, 18)}
          filter={defaultFilter}
        />,
      );

      const scrollArea = container.querySelector(".overflow-y-auto");
      expect(scrollArea).not.toBeNull();
      expect(scrollArea).toHaveStyle({
        paddingBottom: expectedBottomPadding,
      });
    });

    it("colours the left border with the member's colour", () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      render(
        <ScheduleCalendar
          events={[testEvents[0]]}
          currentDate={today}
          filter={defaultFilter}
        />,
      );

      // The *resolved* value, not `element.style`: reading the inline
      // declaration back would pass even if another rule won the cascade.
      //
      // The matching `border-left-width: 4px` guard cannot live here. jsdom
      // loads no Tailwind stylesheet, so `border-l-4` never resolves and
      // `getComputedStyle(row).borderLeftWidth` returns the UA default `2px`
      // for a <button> whether or not the class is present — pinning it would
      // prove nothing. That half is enforced in `e2e/mobile-calendar.spec.ts`
      // against real CSS, mirroring what the lg+ branch does in
      // `e2e/large-screen-calendar-schedule.spec.ts`.
      const row = screen.getByRole("button", { name: /Morning Meeting/ });
      expect(getComputedStyle(row).borderLeftColor).toBe(
        hexToRgb(colorMap[testMembers[0].color].hex),
      );
      // `colorMap[x].bg` and `colorMap[x].light` are both `bg-*` utilities, so
      // twMerge collapses them and the border colour class disappears. The
      // background must survive the fix that restores the border.
      expect(row).toHaveClass(colorMap[testMembers[0].color].light);
    });

    it("leaves a member-less row on the default border colour", () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const orphan = createTestEvent({
        id: "orphan",
        title: "Orphan Event",
        date: today,
        memberId: "removed-member",
      });

      render(
        <ScheduleCalendar
          events={[orphan]}
          currentDate={today}
          filter={{
            ...defaultFilter,
            selectedMembers: [
              ...defaultFilter.selectedMembers,
              "removed-member",
            ],
          }}
        />,
      );

      // `border-muted-foreground` is a *border* utility, so it never collided
      // with `bg-muted` and this branch already renders as intended. Fixing the
      // member branch must not disturb it.
      const row = screen.getByRole("button", { name: /Orphan Event/ });
      expect(row).toHaveClass("border-muted-foreground", "bg-muted");
      expect(row.style.borderLeftColor).toBe("");
    });
  });

  describe("large screen", () => {
    const fixedNow = new Date(2026, 2, 18, 12, 0, 0); // Wed Mar 18 2026

    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(fixedNow);
      setViewportWidth(1280);
    });

    afterEach(() => {
      vi.useRealTimers();
      resetViewportWidth();
    });

    function renderSchedule() {
      // Mar 18 populated, Mar 19-20 empty (the gap), Mar 21 populated.
      const events = [
        createTestEvent({
          id: "e1",
          title: "Test Event",
          date: new Date(2026, 2, 18),
          memberId: testMembers[0].id,
        }),
        createTestEvent({
          id: "e2",
          title: "Later Event",
          date: new Date(2026, 2, 21),
          memberId: testMembers[0].id,
        }),
      ];
      return render(
        <ScheduleCalendar
          events={events}
          currentDate={fixedNow}
          filter={defaultFilter}
        />,
      );
    }

    it("splits the date into gutter label, date and count", () => {
      renderSchedule();
      const region = screen.getByRole("region", {
        name: /Today, Wednesday March 18, 2026, 1 event/i,
      });
      expect(region).toBeInTheDocument();
      expect(within(region).getByText("Today")).toBeInTheDocument();
      expect(within(region).getByText("Wed, Mar 18")).toBeInTheDocument();
    });

    it("renders a gap row for an event-free stretch", () => {
      renderSchedule();
      const gap = screen.getByRole("group", {
        name: /Thursday March 19, 2026 to Friday March 20, 2026, nothing scheduled/i,
      });
      expect(gap).not.toHaveAttribute("tabindex");
      expect(within(gap).getByText("Nothing scheduled")).toBeInTheDocument();
    });

    it("disambiguates a gap that crosses a year boundary", () => {
      const events = [
        createTestEvent({
          id: "dec",
          title: "December event",
          date: new Date(2026, 11, 30),
          memberId: testMembers[0].id,
        }),
        createTestEvent({
          id: "jan",
          title: "January event",
          date: new Date(2027, 0, 2),
          memberId: testMembers[0].id,
        }),
      ];
      render(
        <ScheduleCalendar
          events={events}
          currentDate={new Date(2026, 11, 30)}
          filter={defaultFilter}
        />,
      );
      const gap = screen.getByRole("group", {
        name: /Thursday December 31, 2026 to Friday January 1, 2027, nothing scheduled/i,
      });
      expect(gap).toBeInTheDocument();
      expect(
        within(gap).getByText("Thu, Dec 31, 2026 – Fri, Jan 1, 2027"),
      ).toBeInTheDocument();
    });

    it("disambiguates a gap that crosses a month boundary", () => {
      const events = [
        createTestEvent({
          id: "march",
          title: "March event",
          date: new Date(2026, 2, 30),
          memberId: testMembers[0].id,
        }),
        createTestEvent({
          id: "april",
          title: "April event",
          date: new Date(2026, 3, 2),
          memberId: testMembers[0].id,
        }),
      ];
      render(
        <ScheduleCalendar
          events={events}
          currentDate={new Date(2026, 2, 30)}
          filter={defaultFilter}
        />,
      );
      const gap = screen.getByRole("group", {
        name: /Tuesday March 31, 2026 to Wednesday April 1, 2026, nothing scheduled/i,
      });
      expect(
        within(gap).getByText("Tue, Mar 31 – Wed, Apr 1"),
      ).toBeInTheDocument();
    });

    it("shows the member name as visible text", () => {
      renderSchedule();
      expect(screen.getAllByText(testMembers[0].name).length).toBeGreaterThan(
        0,
      );
    });

    /**
     * A removed member is reachable, not hypothetical: the calendar store
     * persists `filter.selectedMembers`, so an id can outlive the member it
     * named and keep letting that member's events through the filter. The
     * fixture therefore keeps the stale id selected.
     */
    function renderWithRemovedMember() {
      const events = [
        createTestEvent({
          id: "kept",
          title: "Kept Event",
          date: fixedNow,
          memberId: testMembers[0].id,
        }),
        createTestEvent({
          id: "orphan",
          title: "Orphan Event",
          date: fixedNow,
          memberId: "removed-member",
        }),
      ];
      return render(
        <ScheduleCalendar
          events={events}
          currentDate={fixedNow}
          filter={{
            ...defaultFilter,
            selectedMembers: [
              ...defaultFilter.selectedMembers,
              "removed-member",
            ],
          }}
        />,
      );
    }

    it("names a member who is no longer in the family", () => {
      renderWithRemovedMember();
      const row = screen.getByRole("button", { name: /Orphan Event/ });
      // Same string as month-overflow-popover.tsx, so the two surfaces agree.
      expect(within(row).getByText("Unknown member")).toBeInTheDocument();
    });

    it("omits the avatar for a removed member but keeps it for a real one", () => {
      const { container } = renderWithRemovedMember();
      const orphan = screen.getByRole("button", { name: /Orphan Event/ });
      const kept = screen.getByRole("button", { name: /Kept Event/ });
      // MemberAvatar is the only rounded-full element inside an event row, and
      // it needs a real FamilyColor — so the fallback must not render one.
      expect(kept.querySelector(".rounded-full")).not.toBeNull();
      expect(orphan.querySelector(".rounded-full")).toBeNull();
      expect(container.querySelectorAll(".rounded-full")).toHaveLength(1);
    });

    it("gives the fallback the same treatment as a real member name", () => {
      renderWithRemovedMember();
      const fallback = within(
        screen.getByRole("button", { name: /Orphan Event/ }),
      ).getByText("Unknown member");
      const real = within(
        screen.getByRole("button", { name: /Kept Event/ }),
      ).getByText(testMembers[0].name);
      // Identity must not visually downgrade when the member is missing.
      expect(fallback.className).toBe(real.className);
    });

    it("colours the left border with the member's colour", () => {
      renderSchedule();
      const row = screen.getByRole("button", { name: /Test Event/ });
      expect(row).toHaveStyle({
        borderLeftColor: colorMap[testMembers[0].color].hex,
      });
    });

    it("renders event titles at the 20px large-screen size", () => {
      renderSchedule();
      expect(screen.getByRole("heading", { name: "Test Event" })).toHaveClass(
        "text-xl",
      );
    });

    it("uses the full surface without a fixed outer max width", () => {
      const { container } = renderSchedule();
      const content = container.querySelector(".w-full.space-y-1");
      expect(content).not.toBeNull();
      // The shipped compact centred column is what this branch has to shed.
      // Asserting only the absence of an inline 1400px cap is near-vacuous —
      // nothing sets one — so pin the real regression: `mx-auto max-w-3xl`
      // must not survive into the lg+ composition.
      expect(container.querySelector(".mx-auto.max-w-3xl")).toBeNull();
      expect(content).not.toHaveStyle({ maxWidth: "1400px" });
    });

    it("de-emphasises a past group without opacity on event text", () => {
      const past = createTestEvent({
        id: "past",
        title: "Past Event",
        date: new Date(2026, 2, 17),
        memberId: testMembers[0].id,
      });
      render(
        <ScheduleCalendar
          events={[past]}
          currentDate={new Date(2026, 2, 17)}
          filter={defaultFilter}
        />,
      );
      const region = screen.getByRole("region", { name: /Tuesday March 17/ });
      expect(region).toHaveClass("border-border/40");
      expect(
        screen.getByRole("button", { name: /Past Event/ }).className,
      ).not.toMatch(/opacity/);
    });

    it("distinguishes no selection from a genuinely empty window", () => {
      const { rerender } = render(
        <ScheduleCalendar
          events={[]}
          currentDate={fixedNow}
          filter={{ selectedMembers: [], showAllDayEvents: true }}
        />,
      );
      expect(
        screen.getByText("Select at least one profile to view events"),
      ).toBeInTheDocument();
      rerender(
        <ScheduleCalendar
          events={[]}
          currentDate={fixedNow}
          filter={defaultFilter}
        />,
      );
      expect(screen.getByText("No upcoming events")).toBeInTheDocument();
    });

    it("uses a truthful zero-member empty state", () => {
      resetFamilyStore();
      seedFamilyStore({ name: "Empty Family", members: [] });
      render(
        <ScheduleCalendar
          events={[]}
          currentDate={fixedNow}
          filter={{ selectedMembers: [], showAllDayEvents: true }}
        />,
      );
      expect(screen.getByText("No family members yet")).toBeInTheDocument();
    });

    it("identifies events hidden by active filters", () => {
      const allDay = createTestEvent({
        id: "all-day",
        title: "All-day event",
        date: fixedNow,
        memberId: testMembers[0].id,
        isAllDay: true,
      });
      render(
        <ScheduleCalendar
          events={[allDay]}
          currentDate={fixedNow}
          filter={{ ...defaultFilter, showAllDayEvents: false }}
        />,
      );
      expect(
        screen.getByText("No events match your filters"),
      ).toBeInTheDocument();
    });

    it("does not count the query-only fifteenth day as part of the window", () => {
      const boundary = createTestEvent({
        id: "boundary",
        title: "Boundary event",
        date: addDays(fixedNow, 14),
        memberId: testMembers[0].id,
      });
      render(
        <ScheduleCalendar
          events={[boundary]}
          currentDate={fixedNow}
          filter={defaultFilter}
        />,
      );
      expect(screen.getByText("No upcoming events")).toBeInTheDocument();
    });

    it("renders loading and error/retry in priority order", async () => {
      // Loading and error outrank the rows, so this case needs no pinned
      // "today" — and userEvent's pointer waits never settle against the
      // describe's fake timers. Matches the Month suite's retry test.
      vi.useRealTimers();
      const user = userEvent.setup();
      const onRetry = vi.fn();
      const { rerender } = render(
        <ScheduleCalendar
          events={[]}
          currentDate={fixedNow}
          filter={defaultFilter}
          isLoading
        />,
      );
      expect(
        screen.getByRole("status", { name: /loading schedule/i }),
      ).toBeInTheDocument();
      rerender(
        <ScheduleCalendar
          events={[]}
          currentDate={fixedNow}
          filter={defaultFilter}
          isLoading
          isError
          errorMessage="No route"
          onRetry={onRetry}
        />,
      );
      expect(
        screen.queryByRole("status", { name: /loading schedule/i }),
      ).not.toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: /try again/i }));
      expect(onRetry).toHaveBeenCalledOnce();
    });
  });
});

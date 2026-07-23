import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

  describe("large composition", () => {
    const fixedNow = new Date(2026, 2, 18, 12, 0, 0);

    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(fixedNow);
      setViewportWidth(1280);
    });

    function renderLargeSchedule() {
      return render(
        <ScheduleCalendar
          events={[
            createTestEvent({
              id: "e1",
              title: "Test Event",
              date: fixedNow,
              memberId: testMembers[0].id,
            }),
            createTestEvent({
              id: "e2",
              title: "Later Event",
              date: new Date(2026, 2, 21),
              memberId: testMembers[0].id,
            }),
          ]}
          currentDate={fixedNow}
          filter={defaultFilter}
        />,
      );
    }

    it("uses the full surface with a date gutter", () => {
      const { container } = renderLargeSchedule();
      const region = screen.getByRole("region", {
        name: /Today, Wednesday March 18, 2026, 1 event/i,
      });
      expect(within(region).getByText("Today")).toBeInTheDocument();
      expect(container.querySelector(".w-full.space-y-1")).not.toBeNull();
      expect(container.querySelector(".mx-auto.max-w-3xl")).toBeNull();
    });

    it("compresses an empty run and keeps member/title information visible", () => {
      renderLargeSchedule();
      expect(
        screen.getByRole("group", {
          name: /Thursday March 19, 2026 to Friday March 20, 2026, nothing scheduled/i,
        }),
      ).toBeInTheDocument();
      expect(screen.getAllByText(testMembers[0].name).length).toBeGreaterThan(
        0,
      );
      expect(screen.getByRole("heading", { name: "Test Event" })).toHaveClass(
        "text-xl",
      );
    });

    it("distinguishes defensive no-selection from a genuinely empty window", () => {
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

    it("identifies events hidden by an active all-day filter", () => {
      const allDay = createTestEvent({
        id: "hidden-all-day",
        title: "Hidden all-day",
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
  });
});

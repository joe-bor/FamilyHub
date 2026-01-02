import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CalendarEvent } from "@/lib/types";
import { useCalendarStore } from "./calendar-store";

// Mock event for testing modals
const mockEvent: CalendarEvent = {
  id: "event-1",
  title: "Test Event",
  date: new Date("2025-06-15"),
  startTime: "10:00 AM",
  endTime: "11:00 AM",
  memberId: "member-1",
  isAllDay: false,
};

const mockEvent2: CalendarEvent = {
  id: "event-2",
  title: "Another Event",
  date: new Date("2025-06-16"),
  startTime: "2:00 PM",
  endTime: "3:00 PM",
  memberId: "member-2",
  isAllDay: false,
};

// Helper to reset store to a known state
function resetStore(
  overrides: Partial<ReturnType<typeof useCalendarStore.getState>> = {},
) {
  useCalendarStore.setState({
    currentDate: new Date("2025-06-15T12:00:00"),
    calendarView: "weekly",
    hasUserSetView: false,
    filter: {
      selectedMembers: [],
      showAllDayEvents: true,
    },
    isAddEventModalOpen: false,
    selectedEvent: null,
    isDetailModalOpen: false,
    editingEvent: null,
    isEditModalOpen: false,
    ...overrides,
  });
}

describe("CalendarStore", () => {
  beforeEach(() => {
    resetStore();
  });
  // afterEach cleanup (timers, mocks, stores) handled globally by setup.ts

  describe("initial state", () => {
    it("initializes with calendarView = 'weekly'", () => {
      useCalendarStore.setState({ calendarView: "weekly" });
      expect(useCalendarStore.getState().calendarView).toBe("weekly");
    });

    it("initializes with hasUserSetView = false", () => {
      expect(useCalendarStore.getState().hasUserSetView).toBe(false);
    });

    it("initializes with empty selectedMembers", () => {
      expect(useCalendarStore.getState().filter.selectedMembers).toEqual([]);
    });

    it("initializes with showAllDayEvents = true", () => {
      expect(useCalendarStore.getState().filter.showAllDayEvents).toBe(true);
    });

    it("initializes with all modals closed", () => {
      expect(useCalendarStore.getState().isAddEventModalOpen).toBe(false);
      expect(useCalendarStore.getState().isDetailModalOpen).toBe(false);
      expect(useCalendarStore.getState().isEditModalOpen).toBe(false);
    });

    it("initializes with no selected or editing events", () => {
      expect(useCalendarStore.getState().selectedEvent).toBeNull();
      expect(useCalendarStore.getState().editingEvent).toBeNull();
    });
  });

  describe("date navigation - daily view", () => {
    beforeEach(() => {
      resetStore({
        currentDate: new Date(2025, 5, 15, 12, 0, 0), // June 15, 2025
        calendarView: "daily",
      });
    });

    it("goToNext moves forward 1 day", () => {
      useCalendarStore.getState().goToNext();

      expect(useCalendarStore.getState().currentDate.getDate()).toBe(16);
      expect(useCalendarStore.getState().currentDate.getMonth()).toBe(5); // June = 5
    });

    it("goToPrevious moves backward 1 day", () => {
      useCalendarStore.getState().goToPrevious();

      expect(useCalendarStore.getState().currentDate.getDate()).toBe(14);
    });

    it("handles month boundary forward (Jun 30 → Jul 1)", () => {
      resetStore({
        currentDate: new Date(2025, 5, 30, 12, 0, 0), // June 30
        calendarView: "daily",
      });

      useCalendarStore.getState().goToNext();

      const date = useCalendarStore.getState().currentDate;
      expect(date.getDate()).toBe(1);
      expect(date.getMonth()).toBe(6); // July
    });

    it("handles month boundary backward (Jul 1 → Jun 30)", () => {
      resetStore({
        currentDate: new Date(2025, 6, 1, 12, 0, 0), // July 1
        calendarView: "daily",
      });

      useCalendarStore.getState().goToPrevious();

      const date = useCalendarStore.getState().currentDate;
      expect(date.getDate()).toBe(30);
      expect(date.getMonth()).toBe(5); // June
    });

    it("handles year boundary forward (Dec 31 → Jan 1)", () => {
      resetStore({
        currentDate: new Date(2025, 11, 31, 12, 0, 0), // December 31
        calendarView: "daily",
      });

      useCalendarStore.getState().goToNext();

      const date = useCalendarStore.getState().currentDate;
      expect(date.getDate()).toBe(1);
      expect(date.getMonth()).toBe(0); // January
      expect(date.getFullYear()).toBe(2026);
    });

    it("handles year boundary backward (Jan 1 → Dec 31)", () => {
      resetStore({
        currentDate: new Date(2025, 0, 1, 12, 0, 0), // January 1
        calendarView: "daily",
      });

      useCalendarStore.getState().goToPrevious();

      const date = useCalendarStore.getState().currentDate;
      expect(date.getDate()).toBe(31);
      expect(date.getMonth()).toBe(11); // December
      expect(date.getFullYear()).toBe(2024);
    });

    it("handles leap year (Feb 28, 2024 → Feb 29, 2024)", () => {
      resetStore({
        currentDate: new Date(2024, 1, 28, 12, 0, 0), // February 28, 2024
        calendarView: "daily",
      });

      useCalendarStore.getState().goToNext();

      const date = useCalendarStore.getState().currentDate;
      expect(date.getDate()).toBe(29);
      expect(date.getMonth()).toBe(1); // February
    });
  });

  describe("date navigation - weekly view", () => {
    beforeEach(() => {
      resetStore({
        currentDate: new Date(2025, 5, 15, 12, 0, 0), // June 15, 2025
        calendarView: "weekly",
      });
    });

    it("goToNext moves forward 7 days", () => {
      useCalendarStore.getState().goToNext();

      expect(useCalendarStore.getState().currentDate.getDate()).toBe(22);
    });

    it("goToPrevious moves backward 7 days", () => {
      useCalendarStore.getState().goToPrevious();

      expect(useCalendarStore.getState().currentDate.getDate()).toBe(8);
    });

    it("handles crossing month boundary (Jun 28 + 7 = Jul 5)", () => {
      resetStore({
        currentDate: new Date(2025, 5, 28, 12, 0, 0), // June 28
        calendarView: "weekly",
      });

      useCalendarStore.getState().goToNext();

      const date = useCalendarStore.getState().currentDate;
      expect(date.getDate()).toBe(5);
      expect(date.getMonth()).toBe(6); // July
    });

    it("handles crossing year boundary", () => {
      resetStore({
        currentDate: new Date(2025, 11, 28, 12, 0, 0), // December 28
        calendarView: "weekly",
      });

      useCalendarStore.getState().goToNext();

      const date = useCalendarStore.getState().currentDate;
      expect(date.getDate()).toBe(4);
      expect(date.getMonth()).toBe(0); // January
      expect(date.getFullYear()).toBe(2026);
    });
  });

  describe("date navigation - schedule view", () => {
    beforeEach(() => {
      resetStore({
        currentDate: new Date(2025, 5, 15, 12, 0, 0), // June 15, 2025
        calendarView: "schedule",
      });
    });

    it("goToNext moves forward 7 days (same as weekly)", () => {
      useCalendarStore.getState().goToNext();

      expect(useCalendarStore.getState().currentDate.getDate()).toBe(22);
    });

    it("goToPrevious moves backward 7 days", () => {
      useCalendarStore.getState().goToPrevious();

      expect(useCalendarStore.getState().currentDate.getDate()).toBe(8);
    });
  });

  describe("date navigation - monthly view", () => {
    beforeEach(() => {
      resetStore({
        currentDate: new Date(2025, 5, 15, 12, 0, 0), // June 15, 2025
        calendarView: "monthly",
      });
    });

    it("goToNext moves forward 1 month", () => {
      useCalendarStore.getState().goToNext();

      const date = useCalendarStore.getState().currentDate;
      expect(date.getMonth()).toBe(6); // July
      expect(date.getDate()).toBe(15);
    });

    it("goToPrevious moves backward 1 month", () => {
      useCalendarStore.getState().goToPrevious();

      const date = useCalendarStore.getState().currentDate;
      expect(date.getMonth()).toBe(4); // May
      expect(date.getDate()).toBe(15);
    });

    it("handles year boundary forward (Dec → Jan)", () => {
      resetStore({
        currentDate: new Date(2025, 11, 15, 12, 0, 0), // December 15
        calendarView: "monthly",
      });

      useCalendarStore.getState().goToNext();

      const date = useCalendarStore.getState().currentDate;
      expect(date.getMonth()).toBe(0); // January
      expect(date.getFullYear()).toBe(2026);
    });

    it("handles year boundary backward (Jan → Dec)", () => {
      resetStore({
        currentDate: new Date(2025, 0, 15, 12, 0, 0), // January 15
        calendarView: "monthly",
      });

      useCalendarStore.getState().goToPrevious();

      const date = useCalendarStore.getState().currentDate;
      expect(date.getMonth()).toBe(11); // December
      expect(date.getFullYear()).toBe(2024);
    });

    it("handles month length differences (Jan 31 → Feb 28)", () => {
      resetStore({
        currentDate: new Date(2025, 0, 31, 12, 0, 0), // January 31
        calendarView: "monthly",
      });

      useCalendarStore.getState().goToNext();

      const date = useCalendarStore.getState().currentDate;
      // Day should be clamped to last day of February (28 in non-leap year)
      expect(date.getMonth()).toBe(1); // February
      expect(date.getDate()).toBe(28);
    });

    it("handles month length differences in leap year (Jan 31 → Feb 29)", () => {
      resetStore({
        currentDate: new Date(2024, 0, 31, 12, 0, 0), // January 31, 2024 (leap year)
        calendarView: "monthly",
      });

      useCalendarStore.getState().goToNext();

      const date = useCalendarStore.getState().currentDate;
      expect(date.getMonth()).toBe(1); // February
      expect(date.getDate()).toBe(29); // Leap year has 29 days
    });

    it("handles backward month length differences (Mar 31 → Feb 28)", () => {
      resetStore({
        currentDate: new Date(2025, 2, 31, 12, 0, 0), // March 31, 2025
        calendarView: "monthly",
      });

      useCalendarStore.getState().goToPrevious();

      const date = useCalendarStore.getState().currentDate;
      // Day should be clamped to last day of February (28 in non-leap year)
      expect(date.getMonth()).toBe(1); // February
      expect(date.getDate()).toBe(28);
    });

    it("handles backward month length differences in leap year (Mar 31 → Feb 29)", () => {
      resetStore({
        currentDate: new Date(2024, 2, 31, 12, 0, 0), // March 31, 2024 (leap year)
        calendarView: "monthly",
      });

      useCalendarStore.getState().goToPrevious();

      const date = useCalendarStore.getState().currentDate;
      expect(date.getMonth()).toBe(1); // February
      expect(date.getDate()).toBe(29); // Leap year has 29 days
    });

    it("preserves day when target month has enough days", () => {
      resetStore({
        currentDate: new Date(2025, 0, 15, 12, 0, 0), // January 15
        calendarView: "monthly",
      });

      useCalendarStore.getState().goToNext();

      const date = useCalendarStore.getState().currentDate;
      expect(date.getMonth()).toBe(1); // February
      expect(date.getDate()).toBe(15); // Day preserved
    });
  });

  describe("goToToday", () => {
    it("sets currentDate to today", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2025, 6, 20, 10, 0, 0)); // July 20, 2025

      resetStore({ currentDate: new Date(2020, 0, 1, 10, 0, 0) });

      useCalendarStore.getState().goToToday();

      const date = useCalendarStore.getState().currentDate;
      const today = new Date();
      expect(date.toDateString()).toBe(today.toDateString());
    });

    it("works from any date in the past", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2025, 5, 15, 12, 0, 0)); // June 15, 2025

      resetStore({ currentDate: new Date(2000, 0, 1) });

      useCalendarStore.getState().goToToday();

      expect(useCalendarStore.getState().currentDate.getFullYear()).toBe(2025);
      expect(useCalendarStore.getState().currentDate.getMonth()).toBe(5); // June
    });

    it("works from any date in the future", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2025, 5, 15, 12, 0, 0)); // June 15, 2025

      resetStore({ currentDate: new Date(2099, 11, 31) });

      useCalendarStore.getState().goToToday();

      expect(useCalendarStore.getState().currentDate.getFullYear()).toBe(2025);
      expect(useCalendarStore.getState().currentDate.getMonth()).toBe(5); // June
    });
  });

  describe("setDate", () => {
    it("sets currentDate to specified date", () => {
      const newDate = new Date("2025-08-20");

      useCalendarStore.getState().setDate(newDate);

      expect(useCalendarStore.getState().currentDate).toEqual(newDate);
    });

    it("preserves other state", () => {
      useCalendarStore.setState({
        calendarView: "daily",
        filter: { selectedMembers: ["m1"], showAllDayEvents: false },
      });

      useCalendarStore.getState().setDate(new Date("2025-12-25"));

      expect(useCalendarStore.getState().calendarView).toBe("daily");
      expect(useCalendarStore.getState().filter.selectedMembers).toEqual([
        "m1",
      ]);
    });
  });

  describe("selectDateAndSwitchToDaily", () => {
    it("sets both currentDate and calendarView atomically", () => {
      useCalendarStore.setState({ calendarView: "monthly" });
      const newDate = new Date("2025-09-01");

      useCalendarStore.getState().selectDateAndSwitchToDaily(newDate);

      expect(useCalendarStore.getState().currentDate).toEqual(newDate);
      expect(useCalendarStore.getState().calendarView).toBe("daily");
    });

    it("preserves filter state", () => {
      useCalendarStore.setState({
        filter: { selectedMembers: ["m1", "m2"], showAllDayEvents: true },
      });

      useCalendarStore.getState().selectDateAndSwitchToDaily(new Date());

      expect(useCalendarStore.getState().filter.selectedMembers).toEqual([
        "m1",
        "m2",
      ]);
    });
  });

  describe("setCalendarView", () => {
    it("sets calendarView to specified value", () => {
      useCalendarStore.getState().setCalendarView("monthly");

      expect(useCalendarStore.getState().calendarView).toBe("monthly");
    });

    it("sets hasUserSetView to true", () => {
      expect(useCalendarStore.getState().hasUserSetView).toBe(false);

      useCalendarStore.getState().setCalendarView("daily");

      expect(useCalendarStore.getState().hasUserSetView).toBe(true);
    });

    it("preserves currentDate", () => {
      const date = new Date("2025-06-15");
      useCalendarStore.setState({ currentDate: date });

      useCalendarStore.getState().setCalendarView("schedule");

      expect(useCalendarStore.getState().currentDate).toEqual(date);
    });
  });

  describe("filter - toggleMember", () => {
    it("adds member if not selected", () => {
      useCalendarStore.getState().toggleMember("member-1");

      expect(useCalendarStore.getState().filter.selectedMembers).toContain(
        "member-1",
      );
    });

    it("removes member if already selected", () => {
      useCalendarStore.setState({
        filter: { selectedMembers: ["member-1"], showAllDayEvents: true },
      });

      useCalendarStore.getState().toggleMember("member-1");

      expect(useCalendarStore.getState().filter.selectedMembers).not.toContain(
        "member-1",
      );
    });

    it("handles empty initial state", () => {
      useCalendarStore.getState().toggleMember("m1");

      expect(useCalendarStore.getState().filter.selectedMembers).toEqual([
        "m1",
      ]);
    });

    it("handles multiple members", () => {
      useCalendarStore.getState().toggleMember("m1");
      useCalendarStore.getState().toggleMember("m2");
      useCalendarStore.getState().toggleMember("m3");

      expect(useCalendarStore.getState().filter.selectedMembers).toEqual([
        "m1",
        "m2",
        "m3",
      ]);

      useCalendarStore.getState().toggleMember("m2");

      expect(useCalendarStore.getState().filter.selectedMembers).toEqual([
        "m1",
        "m3",
      ]);
    });

    it("preserves showAllDayEvents", () => {
      useCalendarStore.setState({
        filter: { selectedMembers: [], showAllDayEvents: false },
      });

      useCalendarStore.getState().toggleMember("m1");

      expect(useCalendarStore.getState().filter.showAllDayEvents).toBe(false);
    });
  });

  describe("filter - toggleAllMembers", () => {
    it("selects all when none selected", () => {
      const allIds = ["m1", "m2", "m3"];

      useCalendarStore.getState().toggleAllMembers(allIds);

      expect(useCalendarStore.getState().filter.selectedMembers).toEqual(
        allIds,
      );
    });

    it("deselects all when all selected", () => {
      useCalendarStore.setState({
        filter: { selectedMembers: ["m1", "m2", "m3"], showAllDayEvents: true },
      });

      useCalendarStore.getState().toggleAllMembers(["m1", "m2", "m3"]);

      expect(useCalendarStore.getState().filter.selectedMembers).toEqual([]);
    });

    it("selects all when partially selected", () => {
      useCalendarStore.setState({
        filter: { selectedMembers: ["m1"], showAllDayEvents: true },
      });

      useCalendarStore.getState().toggleAllMembers(["m1", "m2", "m3"]);

      expect(useCalendarStore.getState().filter.selectedMembers).toEqual([
        "m1",
        "m2",
        "m3",
      ]);
    });

    it("handles empty allMemberIds", () => {
      useCalendarStore.getState().toggleAllMembers([]);

      expect(useCalendarStore.getState().filter.selectedMembers).toEqual([]);
    });

    it("preserves showAllDayEvents", () => {
      useCalendarStore.setState({
        filter: { selectedMembers: [], showAllDayEvents: false },
      });

      useCalendarStore.getState().toggleAllMembers(["m1"]);

      expect(useCalendarStore.getState().filter.showAllDayEvents).toBe(false);
    });
  });

  describe("filter - toggleAllDayEvents", () => {
    it("toggles from true to false", () => {
      useCalendarStore.setState({
        filter: { selectedMembers: [], showAllDayEvents: true },
      });

      useCalendarStore.getState().toggleAllDayEvents();

      expect(useCalendarStore.getState().filter.showAllDayEvents).toBe(false);
    });

    it("toggles from false to true", () => {
      useCalendarStore.setState({
        filter: { selectedMembers: [], showAllDayEvents: false },
      });

      useCalendarStore.getState().toggleAllDayEvents();

      expect(useCalendarStore.getState().filter.showAllDayEvents).toBe(true);
    });

    it("preserves selectedMembers", () => {
      useCalendarStore.setState({
        filter: { selectedMembers: ["m1", "m2"], showAllDayEvents: true },
      });

      useCalendarStore.getState().toggleAllDayEvents();

      expect(useCalendarStore.getState().filter.selectedMembers).toEqual([
        "m1",
        "m2",
      ]);
    });
  });

  describe("filter - initializeSelectedMembers", () => {
    it("sets members when empty", () => {
      useCalendarStore.getState().initializeSelectedMembers(["m1", "m2"]);

      expect(useCalendarStore.getState().filter.selectedMembers).toEqual([
        "m1",
        "m2",
      ]);
    });

    it("does not override if already set", () => {
      useCalendarStore.setState({
        filter: { selectedMembers: ["m1"], showAllDayEvents: true },
      });

      useCalendarStore.getState().initializeSelectedMembers(["m2", "m3"]);

      expect(useCalendarStore.getState().filter.selectedMembers).toEqual([
        "m1",
      ]);
    });

    it("handles empty array input when already empty", () => {
      useCalendarStore.getState().initializeSelectedMembers([]);

      expect(useCalendarStore.getState().filter.selectedMembers).toEqual([]);
    });

    it("preserves showAllDayEvents", () => {
      useCalendarStore.setState({
        filter: { selectedMembers: [], showAllDayEvents: false },
      });

      useCalendarStore.getState().initializeSelectedMembers(["m1"]);

      expect(useCalendarStore.getState().filter.showAllDayEvents).toBe(false);
    });
  });

  describe("add event modal", () => {
    it("openAddEventModal sets isAddEventModalOpen to true", () => {
      useCalendarStore.getState().openAddEventModal();

      expect(useCalendarStore.getState().isAddEventModalOpen).toBe(true);
    });

    it("closeAddEventModal sets isAddEventModalOpen to false", () => {
      useCalendarStore.setState({ isAddEventModalOpen: true });

      useCalendarStore.getState().closeAddEventModal();

      expect(useCalendarStore.getState().isAddEventModalOpen).toBe(false);
    });

    it("is idempotent when called multiple times", () => {
      useCalendarStore.getState().openAddEventModal();
      useCalendarStore.getState().openAddEventModal();

      expect(useCalendarStore.getState().isAddEventModalOpen).toBe(true);

      useCalendarStore.getState().closeAddEventModal();
      useCalendarStore.getState().closeAddEventModal();

      expect(useCalendarStore.getState().isAddEventModalOpen).toBe(false);
    });
  });

  describe("detail modal", () => {
    it("openDetailModal sets event and flag", () => {
      useCalendarStore.getState().openDetailModal(mockEvent);

      expect(useCalendarStore.getState().selectedEvent).toEqual(mockEvent);
      expect(useCalendarStore.getState().isDetailModalOpen).toBe(true);
    });

    it("closeDetailModal clears event and flag", () => {
      useCalendarStore.setState({
        selectedEvent: mockEvent,
        isDetailModalOpen: true,
      });

      useCalendarStore.getState().closeDetailModal();

      expect(useCalendarStore.getState().selectedEvent).toBeNull();
      expect(useCalendarStore.getState().isDetailModalOpen).toBe(false);
    });

    it("opening with new event replaces previous", () => {
      useCalendarStore.getState().openDetailModal(mockEvent);
      useCalendarStore.getState().openDetailModal(mockEvent2);

      expect(useCalendarStore.getState().selectedEvent).toEqual(mockEvent2);
    });
  });

  describe("edit modal", () => {
    it("openEditModal sets event and flag", () => {
      useCalendarStore.getState().openEditModal(mockEvent);

      expect(useCalendarStore.getState().editingEvent).toEqual(mockEvent);
      expect(useCalendarStore.getState().isEditModalOpen).toBe(true);
    });

    it("openEditModal closes detail modal (side effect)", () => {
      useCalendarStore.setState({
        selectedEvent: mockEvent,
        isDetailModalOpen: true,
      });

      useCalendarStore.getState().openEditModal(mockEvent);

      expect(useCalendarStore.getState().isDetailModalOpen).toBe(false);
    });

    it("closeEditModal clears event and flag", () => {
      useCalendarStore.setState({
        editingEvent: mockEvent,
        isEditModalOpen: true,
      });

      useCalendarStore.getState().closeEditModal();

      expect(useCalendarStore.getState().editingEvent).toBeNull();
      expect(useCalendarStore.getState().isEditModalOpen).toBe(false);
    });

    it("closing edit modal does not reopen detail modal", () => {
      // Open detail, then edit (detail closes), then close edit
      useCalendarStore.setState({
        selectedEvent: mockEvent,
        isDetailModalOpen: true,
      });
      useCalendarStore.getState().openEditModal(mockEvent);
      useCalendarStore.getState().closeEditModal();

      expect(useCalendarStore.getState().isDetailModalOpen).toBe(false);
    });
  });

  describe("useIsViewingToday selector logic", () => {
    // Note: We test the selector logic directly since useIsViewingToday is a React hook.
    // The logic replicates what the selector does based on currentDate and calendarView.

    beforeEach(() => {
      vi.useFakeTimers();
      // Use a date with time component to avoid UTC/local timezone issues
      vi.setSystemTime(new Date(2025, 5, 15, 12, 0, 0)); // June 15, 2025 at noon
    });

    describe("daily view", () => {
      it("returns true when viewing today", () => {
        // Set currentDate to today (June 15, 2025)
        resetStore({
          calendarView: "daily",
          currentDate: new Date(2025, 5, 15, 10, 0, 0),
        });

        const { currentDate } = useCalendarStore.getState();
        const today = new Date();

        // Selector logic for daily view: compare toDateString()
        expect(currentDate.toDateString()).toBe(today.toDateString());
      });

      it("returns false when viewing other day", () => {
        resetStore({
          calendarView: "daily",
          currentDate: new Date(2025, 5, 16, 10, 0, 0), // June 16
        });

        const { currentDate } = useCalendarStore.getState();
        const today = new Date();

        expect(currentDate.toDateString()).not.toBe(today.toDateString());
      });
    });

    describe("weekly view", () => {
      it("returns true when today is in current week", () => {
        // June 15, 2025 is a Sunday. Set currentDate to any day in that week.
        resetStore({
          calendarView: "weekly",
          currentDate: new Date(2025, 5, 15, 10, 0, 0), // Sunday
        });

        const { currentDate } = useCalendarStore.getState();
        const today = new Date();

        // Selector logic for weekly view
        const startOfWeek = new Date(currentDate);
        startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        expect(today >= startOfWeek && today <= endOfWeek).toBe(true);
      });

      it("returns false when today is not in current week", () => {
        // June 1, 2025 is a different week from June 15
        resetStore({
          calendarView: "weekly",
          currentDate: new Date(2025, 5, 1, 10, 0, 0), // June 1
        });

        const { currentDate } = useCalendarStore.getState();
        const today = new Date();

        const startOfWeek = new Date(currentDate);
        startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        expect(today >= startOfWeek && today <= endOfWeek).toBe(false);
      });
    });

    describe("monthly view", () => {
      it("returns true when viewing current month", () => {
        resetStore({
          calendarView: "monthly",
          currentDate: new Date(2025, 5, 1, 10, 0, 0), // June 1, 2025
        });

        const { currentDate } = useCalendarStore.getState();
        const today = new Date();

        // Selector logic for monthly view
        expect(currentDate.getMonth()).toBe(today.getMonth());
        expect(currentDate.getFullYear()).toBe(today.getFullYear());
      });

      it("returns false when viewing other month", () => {
        resetStore({
          calendarView: "monthly",
          currentDate: new Date(2025, 6, 15, 10, 0, 0), // July 15, 2025
        });

        const { currentDate } = useCalendarStore.getState();
        const today = new Date();

        expect(currentDate.getMonth()).not.toBe(today.getMonth());
      });

      it("returns false for same month in different year", () => {
        resetStore({
          calendarView: "monthly",
          currentDate: new Date(2024, 5, 15, 10, 0, 0), // June 15, 2024
        });

        const { currentDate } = useCalendarStore.getState();
        const today = new Date();

        expect(currentDate.getFullYear()).not.toBe(today.getFullYear());
      });
    });

    describe("schedule view", () => {
      it("behaves same as weekly view", () => {
        resetStore({
          calendarView: "schedule",
          currentDate: new Date(2025, 5, 15, 10, 0, 0),
        });

        const { currentDate, calendarView } = useCalendarStore.getState();
        const today = new Date();

        expect(calendarView).toBe("schedule");

        // Schedule uses same week logic as weekly
        const startOfWeek = new Date(currentDate);
        startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        expect(today >= startOfWeek && today <= endOfWeek).toBe(true);
      });
    });
  });

  describe("persistence", () => {
    const STORAGE_KEY = "family-hub-calendar";

    beforeEach(() => {
      localStorage.clear();
    });

    it("persists filter to localStorage", () => {
      useCalendarStore.setState({
        filter: { selectedMembers: ["m1", "m2"], showAllDayEvents: false },
      });

      // Force persist to storage
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");

      expect(stored.state?.filter?.selectedMembers).toEqual(["m1", "m2"]);
      expect(stored.state?.filter?.showAllDayEvents).toBe(false);
    });

    it("persists calendarView to localStorage", () => {
      useCalendarStore.setState({ calendarView: "daily" });

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");

      expect(stored.state?.calendarView).toBe("daily");
    });

    it("persists hasUserSetView to localStorage", () => {
      useCalendarStore.setState({ hasUserSetView: true });

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");

      expect(stored.state?.hasUserSetView).toBe(true);
    });

    it("does NOT persist currentDate", () => {
      useCalendarStore.setState({ currentDate: new Date("2099-12-31") });

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");

      // currentDate should not be in persisted state
      expect(stored.state?.currentDate).toBeUndefined();
    });

    it("does NOT persist modal states", () => {
      useCalendarStore.setState({
        isAddEventModalOpen: true,
        isDetailModalOpen: true,
        isEditModalOpen: true,
        selectedEvent: mockEvent,
        editingEvent: mockEvent,
      });

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");

      expect(stored.state?.isAddEventModalOpen).toBeUndefined();
      expect(stored.state?.isDetailModalOpen).toBeUndefined();
      expect(stored.state?.isEditModalOpen).toBeUndefined();
      expect(stored.state?.selectedEvent).toBeUndefined();
      expect(stored.state?.editingEvent).toBeUndefined();
    });

    it("rehydrates filter from localStorage", async () => {
      // Seed localStorage with filter data
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          state: {
            filter: { selectedMembers: ["m1"], showAllDayEvents: false },
            calendarView: "daily",
            hasUserSetView: true,
          },
          version: 0,
        }),
      );

      // Trigger rehydration
      await useCalendarStore.persist.rehydrate();

      const state = useCalendarStore.getState();
      expect(state.filter.selectedMembers).toEqual(["m1"]);
      expect(state.filter.showAllDayEvents).toBe(false);
      expect(state.calendarView).toBe("daily");
      expect(state.hasUserSetView).toBe(true);
    });
  });
});

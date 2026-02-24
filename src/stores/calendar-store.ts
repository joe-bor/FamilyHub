import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useShallow } from "zustand/shallow";
import type { CalendarEvent, CalendarViewType, FilterState } from "@/lib/types";

interface CalendarState {
  // Client-only state (server state is now in TanStack Query)
  currentDate: Date;
  calendarView: CalendarViewType;
  hasUserSetView: boolean; // Track if user explicitly changed view (for smart defaulting)
  filter: FilterState;
  isAddEventModalOpen: boolean;

  // Event detail modal state
  selectedEvent: CalendarEvent | null;
  isDetailModalOpen: boolean;

  // Edit modal state (separate from add)
  editingEvent: CalendarEvent | null;
  isEditModalOpen: boolean;

  // Navigation actions
  goToToday: () => void;
  goToPrevious: () => void;
  goToNext: () => void;
  setDate: (date: Date) => void;
  selectDateAndSwitchToDaily: (date: Date) => void;

  // View actions
  setCalendarView: (view: CalendarViewType) => void;

  // Filter actions
  setFilter: (filter: FilterState) => void;
  toggleMember: (memberId: string) => void;
  toggleAllMembers: (allMemberIds: string[]) => void;
  toggleAllDayEvents: () => void;
  initializeSelectedMembers: (memberIds: string[]) => void;

  // Modal actions
  openAddEventModal: () => void;
  closeAddEventModal: () => void;

  // Detail modal actions
  openDetailModal: (event: CalendarEvent) => void;
  closeDetailModal: () => void;

  // Edit modal actions
  openEditModal: (event: CalendarEvent) => void;
  closeEditModal: () => void;
}

export const useCalendarStore = create<CalendarState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentDate: new Date(),
      calendarView: "weekly",
      hasUserSetView: false,
      filter: {
        selectedMembers: [], // Will be initialized when family members are loaded
        showAllDayEvents: true,
      },
      isAddEventModalOpen: false,

      // Event detail modal state
      selectedEvent: null,
      isDetailModalOpen: false,

      // Edit modal state
      editingEvent: null,
      isEditModalOpen: false,

      // Navigation actions
      goToToday: () => set({ currentDate: new Date() }),

      goToPrevious: () => {
        const { currentDate, calendarView } = get();
        const newDate = new Date(currentDate);

        switch (calendarView) {
          case "daily":
            newDate.setDate(currentDate.getDate() - 1);
            break;
          case "weekly":
          case "schedule":
            newDate.setDate(currentDate.getDate() - 7);
            break;
          case "monthly": {
            // Handle month navigation with day clamping to avoid overflow
            // (e.g., Mar 31 → Feb 28, not Mar 3)
            const targetMonth = currentDate.getMonth() - 1;
            const targetYear =
              targetMonth < 0
                ? currentDate.getFullYear() - 1
                : currentDate.getFullYear();
            const normalizedMonth = targetMonth < 0 ? 11 : targetMonth;
            // Get last day of target month (day 0 of next month = last day of target month)
            const lastDayOfTargetMonth = new Date(
              targetYear,
              normalizedMonth + 1,
              0,
            ).getDate();
            const clampedDay = Math.min(
              currentDate.getDate(),
              lastDayOfTargetMonth,
            );
            newDate.setFullYear(targetYear, normalizedMonth, clampedDay);
            break;
          }
        }

        set({ currentDate: newDate });
      },

      goToNext: () => {
        const { currentDate, calendarView } = get();
        const newDate = new Date(currentDate);

        switch (calendarView) {
          case "daily":
            newDate.setDate(currentDate.getDate() + 1);
            break;
          case "weekly":
          case "schedule":
            newDate.setDate(currentDate.getDate() + 7);
            break;
          case "monthly": {
            // Handle month navigation with day clamping to avoid overflow
            // (e.g., Jan 31 → Feb 28, not Mar 3)
            const targetMonth = currentDate.getMonth() + 1;
            const targetYear =
              targetMonth > 11
                ? currentDate.getFullYear() + 1
                : currentDate.getFullYear();
            const normalizedMonth = targetMonth > 11 ? 0 : targetMonth;
            // Get last day of target month (day 0 of next month = last day of target month)
            const lastDayOfTargetMonth = new Date(
              targetYear,
              normalizedMonth + 1,
              0,
            ).getDate();
            const clampedDay = Math.min(
              currentDate.getDate(),
              lastDayOfTargetMonth,
            );
            newDate.setFullYear(targetYear, normalizedMonth, clampedDay);
            break;
          }
        }

        set({ currentDate: newDate });
      },

      setDate: (date) => set({ currentDate: date }),

      selectDateAndSwitchToDaily: (date) =>
        set({
          currentDate: date,
          calendarView: "daily",
        }),

      // View actions
      setCalendarView: (view) =>
        set({ calendarView: view, hasUserSetView: true }),

      // Filter actions
      setFilter: (filter) => set({ filter }),

      toggleMember: (memberId) => {
        const { filter } = get();
        const isSelected = filter.selectedMembers.includes(memberId);
        const newSelectedMembers = isSelected
          ? filter.selectedMembers.filter((id) => id !== memberId)
          : [...filter.selectedMembers, memberId];

        set({ filter: { ...filter, selectedMembers: newSelectedMembers } });
      },

      toggleAllMembers: (allMemberIds) => {
        const { filter } = get();
        const allSelected =
          filter.selectedMembers.length === allMemberIds.length;

        set({
          filter: {
            ...filter,
            selectedMembers: allSelected ? [] : allMemberIds,
          },
        });
      },

      initializeSelectedMembers: (memberIds) => {
        const { filter } = get();
        set({
          filter: { ...filter, selectedMembers: memberIds },
        });
      },

      toggleAllDayEvents: () => {
        const { filter } = get();
        set({
          filter: { ...filter, showAllDayEvents: !filter.showAllDayEvents },
        });
      },

      // Modal actions
      openAddEventModal: () => set({ isAddEventModalOpen: true }),
      closeAddEventModal: () => set({ isAddEventModalOpen: false }),

      // Detail modal actions
      openDetailModal: (event) =>
        set({ selectedEvent: event, isDetailModalOpen: true }),
      closeDetailModal: () =>
        set({ selectedEvent: null, isDetailModalOpen: false }),

      // Edit modal actions
      openEditModal: (event) =>
        set({
          editingEvent: event,
          isEditModalOpen: true,
          isDetailModalOpen: false, // Close detail when opening edit
        }),
      closeEditModal: () => set({ editingEvent: null, isEditModalOpen: false }),
    }),
    {
      name: "family-hub-calendar",
      // Persist filter and view preferences
      partialize: (state) => ({
        filter: state.filter,
        calendarView: state.calendarView,
        hasUserSetView: state.hasUserSetView,
      }),
    },
  ),
);

// Selector: hasUserSetView (for smart defaulting)
export const useHasUserSetView = () =>
  useCalendarStore((state) => state.hasUserSetView);

// Computed selector: isViewingToday
export const useIsViewingToday = () =>
  useCalendarStore((state) => {
    const { currentDate, calendarView } = state;
    const today = new Date();

    switch (calendarView) {
      case "daily":
        return currentDate.toDateString() === today.toDateString();
      case "weekly":
      case "schedule": {
        const startOfWeek = new Date(currentDate);
        startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        return today >= startOfWeek && today <= endOfWeek;
      }
      case "monthly":
        return (
          currentDate.getMonth() === today.getMonth() &&
          currentDate.getFullYear() === today.getFullYear()
        );
      default:
        return true;
    }
  });

/**
 * Compound selector for calendar state.
 * Combines multiple state values into a single subscription with shallow comparison.
 */
export const useCalendarState = () =>
  useCalendarStore(
    useShallow((state) => ({
      currentDate: state.currentDate,
      calendarView: state.calendarView,
      filter: state.filter,
      isAddEventModalOpen: state.isAddEventModalOpen,
    })),
  );

/**
 * Compound selector for calendar actions.
 * Combines multiple actions into a single subscription.
 */
export const useCalendarActions = () =>
  useCalendarStore(
    useShallow((state) => ({
      goToToday: state.goToToday,
      goToPrevious: state.goToPrevious,
      goToNext: state.goToNext,
      setDate: state.setDate,
      selectDateAndSwitchToDaily: state.selectDateAndSwitchToDaily,
      setCalendarView: state.setCalendarView,
      openAddEventModal: state.openAddEventModal,
      closeAddEventModal: state.closeAddEventModal,
      openEditModal: state.openEditModal,
      closeEditModal: state.closeEditModal,
    })),
  );

/**
 * Compound selector for event detail modal.
 * Combines detail modal state and actions.
 */
export const useEventDetailState = () =>
  useCalendarStore(
    useShallow((state) => ({
      selectedEvent: state.selectedEvent,
      isDetailModalOpen: state.isDetailModalOpen,
      openDetailModal: state.openDetailModal,
      closeDetailModal: state.closeDetailModal,
    })),
  );

/**
 * Compound selector for edit modal state.
 */
export const useEditModalState = () =>
  useCalendarStore(
    useShallow((state) => ({
      editingEvent: state.editingEvent,
      isEditModalOpen: state.isEditModalOpen,
      openEditModal: state.openEditModal,
      closeEditModal: state.closeEditModal,
    })),
  );

/**
 * Compound selector for filter pills component.
 * Combines filter state and toggle actions.
 */
export const useFilterPillsState = () =>
  useCalendarStore(
    useShallow((state) => ({
      filter: state.filter,
      toggleMember: state.toggleMember,
      toggleAllMembers: state.toggleAllMembers,
      toggleAllDayEvents: state.toggleAllDayEvents,
      initializeSelectedMembers: state.initializeSelectedMembers,
    })),
  );

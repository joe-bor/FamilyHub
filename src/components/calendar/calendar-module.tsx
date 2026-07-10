import {
  addDays,
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { useEffect, useMemo, useState } from "react";
import {
  useCalendarEvents,
  useCreateEvent,
  useDeleteEvent,
  useDeleteInstance,
  useFamilyMemberMap,
  useFamilyMembers,
  useUpdateEvent,
  useUpdateInstance,
} from "@/api";
import type { ApiException } from "@/api/client";
import {
  AddEventButton,
  CalendarNavigation,
  CalendarViewSwitcher,
  DailyCalendar,
  DayLanesCalendar,
  DayRailToggle,
  type EditScope,
  EditScopeDialog,
  EventDetailModal,
  EventFormModal,
  FamilyFilterPills,
  getContextLabel,
  MobileDailyView,
  MobileMonthlyView,
  MobileToolbar,
  MobileWeeklyView,
  MonthlyCalendar,
  ScheduleCalendar,
  WeeklyCalendar,
} from "@/components/calendar";
import { railThresholdPx } from "@/components/calendar/utils/day-rail";
import { toast } from "@/components/ui/toaster";
import { useIsLargeScreen, useIsMobile, useMediaQuery } from "@/hooks";
import { isOfflineWriteError } from "@/lib/offline/read-only-guard";
import { buildRRule } from "@/lib/recurrence-utils";
import {
  format24hTo12h,
  formatLocalDate,
  getEventKey,
  parseLocalDate,
} from "@/lib/time-utils";
import type { CalendarEvent, CreateEventRequest } from "@/lib/types";
import type { EventFormData } from "@/lib/validations";
import {
  useAppStore,
  useCalendarActions,
  useCalendarState,
  useCalendarStore,
  useDayRailState,
  useEditModalState,
  useEventDetailState,
  useHasUserSetView,
  useIsViewingToday,
} from "@/stores";

/**
 * Get the parent event ID for recurring event operations.
 * - Virtual instances have recurringEventId but no id
 * - Exceptions have both recurringEventId and id
 * - Parents have only id
 */
function getParentId(event: CalendarEvent): string {
  const id = event.recurringEventId ?? event.id;
  if (!id)
    throw new Error(
      "Cannot resolve parent ID: event has no id or recurringEventId",
    );
  return id;
}

/**
 * Toast when a calendar write fails because the device is offline. Read-only
 * offline mode rejects writes — optimistic ones throw OfflineWriteError before
 * onMutate, others fail with a network error — so without this the only hint is
 * the global banner. Genuine online server errors are left to existing handling.
 */
function notifyOfflineWrite(error: ApiException): void {
  if (
    isOfflineWriteError(error) ||
    (typeof navigator !== "undefined" && navigator.onLine === false)
  ) {
    toast({
      title: "You're offline",
      description: "Changes can't be saved until you reconnect.",
    });
  }
}

export function CalendarModule() {
  // Mobile detection for smart view defaulting
  const isMobile = useIsMobile();
  const hasUserSetView = useHasUserSetView();

  // Smart default: switch to schedule on mobile for first-time users
  useEffect(() => {
    if (!hasUserSetView && isMobile) {
      // Apply smart default without marking as user-set
      useCalendarStore.setState({ calendarView: "schedule" });
    }
  }, [hasUserSetView, isMobile]);

  // Client state from Zustand (compound selector with shallow comparison)
  const { currentDate, calendarView, filter, isAddEventModalOpen } =
    useCalendarState();
  const isViewingToday = useIsViewingToday();

  // Event detail modal state
  const {
    selectedEvent,
    isDetailModalOpen,
    openDetailModal,
    closeDetailModal,
  } = useEventDetailState();

  // Edit modal state
  const { editingEvent, isEditModalOpen, openEditModal, closeEditModal } =
    useEditModalState();

  // Client actions from Zustand (compound selector)
  const {
    goToToday,
    goToPrevious,
    goToNext,
    setDate,
    selectDateAndSwitchToDaily,
    openAddEventModal,
    closeAddEventModal,
  } = useCalendarActions();

  const consumeCalendarFocusDate = useAppStore(
    (s) => s.consumeCalendarFocusDate,
  );
  useEffect(() => {
    const date = consumeCalendarFocusDate();
    if (date) setDate(parseLocalDate(date));
  }, [consumeCalendarFocusDate, setDate]);

  const calendarEventIntent = useAppStore((s) => s.calendarEventIntent);
  const clearCalendarEventIntent = useAppStore(
    (s) => s.clearCalendarEventIntent,
  );
  useEffect(() => {
    if (!calendarEventIntent) return;
    setDate(parseLocalDate(calendarEventIntent.date));
  }, [calendarEventIntent, setDate]);

  // Family data for mobile views
  const members = useFamilyMembers();
  const memberMap = useFamilyMemberMap();
  const isLargeScreen = useIsLargeScreen();
  const { dayRailHidden } = useDayRailState();
  const memberCount = members.length;
  const canFitRail = useMediaQuery(
    `(min-width: ${railThresholdPx(memberCount)}px)`,
  );
  const isDayLanes = !isMobile && isLargeScreen && calendarView === "daily";
  const showDayRail =
    isDayLanes && canFitRail && !dayRailHidden && memberCount > 0;
  const showRailToggle = isDayLanes && canFitRail && memberCount > 0;

  // Compute date range based on current view for API query
  const dateRange = useMemo(() => {
    let start: Date;
    let end: Date;

    switch (calendarView) {
      case "daily":
        start = currentDate;
        end = currentDate;
        break;
      case "weekly":
        start = startOfWeek(currentDate, { weekStartsOn: 0 });
        end = endOfWeek(currentDate, { weekStartsOn: 0 });
        break;
      case "monthly":
        start = startOfMonth(currentDate);
        end = endOfMonth(currentDate);
        break;
      case "schedule":
        start = currentDate;
        end = addDays(currentDate, 14);
        break;
      default:
        start = startOfWeek(currentDate, { weekStartsOn: 0 });
        end = endOfWeek(currentDate, { weekStartsOn: 0 });
    }

    return {
      startDate: format(start, "yyyy-MM-dd"),
      endDate: format(end, "yyyy-MM-dd"),
    };
  }, [currentDate, calendarView]);

  // Server state from TanStack Query
  const {
    data: eventsResponse,
    isLoading,
    isFetching,
    isError,
    error,
  } = useCalendarEvents(dateRange);

  // Unfiltered events for the API response — used by intent lookups that must
  // find an event regardless of the active member/all-day filter state.
  const rawEvents = useMemo(() => eventsResponse?.data ?? [], [eventsResponse]);

  // Mutations
  const createEvent = useCreateEvent({
    onSuccess: () => {
      closeAddEventModal();
    },
    onError: notifyOfflineWrite,
  });

  const deleteEvent = useDeleteEvent({
    onSuccess: () => {
      closeDetailModal();
    },
  });

  const updateEvent = useUpdateEvent({
    onSuccess: () => {
      closeEditModal();
    },
    onError: notifyOfflineWrite,
  });

  const updateInstance = useUpdateInstance({
    onSuccess: () => {
      closeEditModal();
    },
    onError: notifyOfflineWrite,
  });

  const deleteInstance = useDeleteInstance({
    onSuccess: () => {
      closeDetailModal();
      closeScopeDialog();
    },
  });

  const resetDeleteEvent = deleteEvent.reset;
  const resetDeleteInstance = deleteInstance.reset;

  useEffect(() => {
    if (!calendarEventIntent || isLoading) return;

    const match = rawEvents.find(
      (event) => getEventKey(event) === calendarEventIntent.eventKey,
    );
    if (match) {
      resetDeleteEvent();
      resetDeleteInstance();
      openDetailModal(match);
      clearCalendarEventIntent();
      return;
    }

    // No match. Only give up on the intent once the range that should
    // contain it has actually settled — otherwise a deleted/errored event
    // would leave the intent dangling forever, re-snapping the calendar to
    // its date on every remount and popping the modal on a later refetch.
    const rangeCoversIntent =
      dateRange.startDate <= calendarEventIntent.date &&
      calendarEventIntent.date <= dateRange.endDate;
    const querySettled = isError || (!isLoading && !isFetching);
    if (rangeCoversIntent && querySettled) {
      clearCalendarEventIntent();
    }
  }, [
    calendarEventIntent,
    clearCalendarEventIntent,
    dateRange,
    isError,
    isFetching,
    isLoading,
    openDetailModal,
    rawEvents,
    resetDeleteEvent,
    resetDeleteInstance,
  ]);

  // Scope dialog state for recurring events
  const [scopeDialogOpen, setScopeDialogOpen] = useState(false);
  const [scopeAction, setScopeAction] = useState<"edit" | "delete">("edit");
  const [editScope, setEditScope] = useState<EditScope | null>(null);

  const closeScopeDialog = () => {
    setScopeDialogOpen(false);
  };

  // Client-side filtering based on filter state
  const events = useMemo(() => {
    return rawEvents.filter((event) => {
      const memberMatches = filter.selectedMembers.includes(event.memberId);
      const allDayMatches = filter.showAllDayEvents || !event.isAllDay;
      return memberMatches && allDayMatches;
    });
  }, [filter, rawEvents]);

  const handleEventClick = (event: CalendarEvent) => {
    deleteEvent.reset();
    deleteInstance.reset();
    openDetailModal(event);
  };

  const handleDeleteEvent = () => {
    if (!selectedEvent) return;

    // Guard: Google events are read-only
    if (selectedEvent.source === "GOOGLE") {
      toast({
        title: "Synced from Google Calendar",
        description: "Delete this event in Google Calendar.",
      });
      return;
    }

    if (selectedEvent.isRecurring) {
      setScopeAction("delete");
      setScopeDialogOpen(true);
    } else {
      if (!selectedEvent.id) return;
      deleteEvent.mutate(selectedEvent.id);
    }
  };

  const handleEditClick = () => {
    if (!selectedEvent) return;

    // Guard: Google events are read-only
    if (selectedEvent.source === "GOOGLE") {
      toast({
        title: "Synced from Google Calendar",
        description: "Edit this event in Google Calendar.",
      });
      return;
    }

    if (selectedEvent.isRecurring) {
      setScopeAction("edit");
      setScopeDialogOpen(true);
    } else {
      openEditModal(selectedEvent);
    }
  };

  const handleScopeSelect = (scope: EditScope) => {
    if (!selectedEvent) return;
    closeScopeDialog();

    if (scopeAction === "edit") {
      setEditScope(scope);
      openEditModal(selectedEvent);
    } else {
      // Delete
      const parentId = getParentId(selectedEvent);
      if (scope === "this") {
        deleteInstance.mutate({
          parentId,
          date: formatLocalDate(selectedEvent.date),
        });
      } else {
        deleteEvent.mutate(parentId);
      }
    }
  };

  const handleUpdateEvent = (formData: EventFormData) => {
    const currentEditingEvent = useCalendarStore.getState().editingEvent;
    if (!currentEditingEvent) return;

    const request = {
      title: formData.title,
      startTime: format24hTo12h(formData.startTime),
      endTime: format24hTo12h(formData.endTime),
      date: formData.date,
      endDate: formData.endDate ?? null,
      memberId: formData.memberId,
      isAllDay: formData.isAllDay,
      location: formData.location,
      description: formData.description,
    };

    if (currentEditingEvent.isRecurring && editScope === "this") {
      // "This event" — always use instance endpoint
      const parentId = getParentId(currentEditingEvent);
      updateInstance.mutate({
        parentId,
        instanceDate: formatLocalDate(currentEditingEvent.date),
        ...request,
      });
    } else if (currentEditingEvent.isRecurring && editScope === "all") {
      // "All events" — update the parent, include recurrence rule
      const recurrenceRule =
        buildRRule({
          frequency: formData.recurrenceFrequency ?? "none",
          interval: formData.recurrenceInterval ?? 1,
          weeklyDays: formData.recurrenceWeeklyDays,
          monthDay: formData.recurrenceMonthDay,
          endDate: formData.recurrenceEndDate,
        }) ?? null;

      const parentId = getParentId(currentEditingEvent);
      updateEvent.mutate({
        id: parentId,
        ...request,
        recurrenceRule,
      });
    } else {
      // Non-recurring event
      if (!currentEditingEvent.id) return;
      updateEvent.mutate({
        id: currentEditingEvent.id,
        ...request,
      });
    }

    setEditScope(null);
  };

  const handleAddEvent = (formData: EventFormData) => {
    const recurrenceRule =
      buildRRule({
        frequency: formData.recurrenceFrequency ?? "none",
        interval: formData.recurrenceInterval ?? 1,
        weeklyDays: formData.recurrenceWeeklyDays,
        monthDay: formData.recurrenceMonthDay,
        endDate: formData.recurrenceEndDate,
      }) ?? null;

    const request: CreateEventRequest = {
      title: formData.title,
      startTime: format24hTo12h(formData.startTime),
      endTime: format24hTo12h(formData.endTime),
      date: formData.date,
      endDate: formData.endDate ?? null,
      memberId: formData.memberId,
      isAllDay: formData.isAllDay,
      location: formData.location,
      description: formData.description,
      recurrenceRule,
    };
    createEvent.mutate(request);
  };

  const commonProps = {
    events,
    currentDate,
    onEventClick: handleEventClick,
    filter,
  };

  const renderCalendarView = () => {
    // Show loading state
    if (isLoading) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-muted-foreground">Loading events...</div>
        </div>
      );
    }

    // Show error state
    if (isError) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-destructive">
            Error loading events: {error?.message ?? "Unknown error"}
          </div>
        </div>
      );
    }

    if (isMobile) {
      switch (calendarView) {
        case "daily":
          return (
            <MobileDailyView
              events={events}
              currentDate={currentDate}
              memberMap={memberMap}
              onEventClick={handleEventClick}
              onSwipeLeft={goToNext}
              onSwipeRight={goToPrevious}
            />
          );
        case "weekly":
          return (
            <MobileWeeklyView
              events={events}
              currentDate={currentDate}
              memberMap={memberMap}
              onEventClick={handleEventClick}
              onDayClick={(date) => selectDateAndSwitchToDaily(date)}
              onSwipeLeft={goToNext}
              onSwipeRight={goToPrevious}
            />
          );
        case "monthly":
          return (
            <MobileMonthlyView
              events={events}
              currentDate={currentDate}
              memberMap={memberMap}
              onEventClick={handleEventClick}
              onDaySelect={(date) => setDate(date)}
              onSwipeLeft={goToNext}
              onSwipeRight={goToPrevious}
            />
          );
        case "schedule":
          return <ScheduleCalendar {...commonProps} />;
        default:
          return <ScheduleCalendar {...commonProps} />;
      }
    }

    switch (calendarView) {
      case "daily":
        return isLargeScreen ? (
          <DayLanesCalendar
            {...commonProps}
            members={members}
            showRail={showDayRail}
            onSelectDate={setDate}
          />
        ) : (
          <DailyCalendar {...commonProps} />
        );
      case "weekly":
        return <WeeklyCalendar {...commonProps} />;
      case "monthly":
        return (
          <MonthlyCalendar
            {...commonProps}
            onDateSelect={selectDateAndSwitchToDaily}
          />
        );
      case "schedule":
        return <ScheduleCalendar {...commonProps} />;
      default:
        return <WeeklyCalendar {...commonProps} />;
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Toolbar */}
      {isMobile ? (
        <MobileToolbar members={members} />
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-2 px-3 py-2 bg-card border-b border-border">
          <CalendarViewSwitcher />
          <CalendarNavigation
            label={getContextLabel(calendarView, currentDate)}
            onPrevious={goToPrevious}
            onNext={goToNext}
            onToday={goToToday}
            isViewingToday={isViewingToday}
          />
          <div className="flex items-center gap-2">
            <FamilyFilterPills />
            {showRailToggle && <DayRailToggle />}
          </div>
        </div>
      )}

      {/* Calendar View */}
      {renderCalendarView()}

      {/* FAB */}
      <AddEventButton onClick={openAddEventModal} />

      {/* Add Event Modal */}
      <EventFormModal
        mode="add"
        isOpen={isAddEventModalOpen}
        onClose={closeAddEventModal}
        onSubmit={handleAddEvent}
        isPending={createEvent.isPending}
      />

      {/* Edit Event Modal */}
      <EventFormModal
        mode="edit"
        isOpen={isEditModalOpen}
        onClose={() => {
          closeEditModal();
          setEditScope(null);
        }}
        onSubmit={handleUpdateEvent}
        isPending={updateEvent.isPending || updateInstance.isPending}
        event={editingEvent ?? undefined}
        showRecurrencePicker={editScope !== "this"}
      />

      {/* Event Detail Modal */}
      <EventDetailModal
        event={selectedEvent}
        isOpen={isDetailModalOpen}
        onClose={closeDetailModal}
        onEdit={handleEditClick}
        onDelete={handleDeleteEvent}
        isDeleting={deleteEvent.isPending || deleteInstance.isPending}
        deleteError={
          deleteEvent.error?.message ?? deleteInstance.error?.message
        }
      />

      {/* Scope Dialog for Recurring Events */}
      <EditScopeDialog
        isOpen={scopeDialogOpen}
        onClose={closeScopeDialog}
        onSelect={handleScopeSelect}
        action={scopeAction}
      />
    </div>
  );
}

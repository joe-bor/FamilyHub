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
  useUpdateEvent,
  useUpdateInstance,
} from "@/api";
import {
  AddEventButton,
  CalendarViewSwitcher,
  DailyCalendar,
  type EditScope,
  EditScopeDialog,
  EventDetailModal,
  EventFormModal,
  FamilyFilterPills,
  MonthlyCalendar,
  ScheduleCalendar,
  WeeklyCalendar,
} from "@/components/calendar";
import { useIsMobile } from "@/hooks";
import { buildRRule } from "@/lib/recurrence-utils";
import { format24hTo12h, formatLocalDate } from "@/lib/time-utils";
import type { CalendarEvent, CreateEventRequest } from "@/lib/types";
import type { EventFormData } from "@/lib/validations";
import {
  useCalendarActions,
  useCalendarState,
  useCalendarStore,
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
  return event.recurringEventId ?? event.id!;
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
    selectDateAndSwitchToDaily,
    openAddEventModal,
    closeAddEventModal,
  } = useCalendarActions();

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
    isError,
    error,
  } = useCalendarEvents(dateRange);

  // Mutations
  const createEvent = useCreateEvent({
    onSuccess: () => {
      closeAddEventModal();
    },
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
    onError: (error) => {
      console.error("Failed to update event:", error.message);
    },
  });

  const updateInstance = useUpdateInstance({
    onSuccess: () => {
      closeEditModal();
    },
    onError: (error) => {
      console.error("Failed to update instance:", error.message);
    },
  });

  const deleteInstance = useDeleteInstance({
    onSuccess: () => {
      closeDetailModal();
      closeScopeDialog();
    },
  });

  // Scope dialog state for recurring events
  const [scopeDialogOpen, setScopeDialogOpen] = useState(false);
  const [scopeAction, setScopeAction] = useState<"edit" | "delete">("edit");
  const [editScope, setEditScope] = useState<EditScope | null>(null);

  const closeScopeDialog = () => {
    setScopeDialogOpen(false);
  };

  // Client-side filtering based on filter state
  const events = useMemo(() => {
    const rawEvents = eventsResponse?.data ?? [];
    return rawEvents.filter((event) => {
      const memberMatches = filter.selectedMembers.includes(event.memberId);
      const allDayMatches = filter.showAllDayEvents || !event.isAllDay;
      return memberMatches && allDayMatches;
    });
  }, [eventsResponse, filter]);

  const handleEventClick = (event: CalendarEvent) => {
    openDetailModal(event);
  };

  const handleDeleteEvent = () => {
    if (!selectedEvent) return;

    if (selectedEvent.isRecurring) {
      setScopeAction("delete");
      setScopeDialogOpen(true);
    } else {
      deleteEvent.mutate(selectedEvent.id!);
    }
  };

  const handleEditClick = () => {
    if (!selectedEvent) return;

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
    };

    if (currentEditingEvent.isRecurring && editScope === "this") {
      // "This event" — always use instance endpoint
      const parentId = getParentId(currentEditingEvent);
      updateInstance.mutate({
        parentId,
        date: formatLocalDate(currentEditingEvent.date),
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
      updateEvent.mutate({
        id: currentEditingEvent.id!,
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

  const navigationProps = {
    onPrevious: goToPrevious,
    onNext: goToNext,
    onToday: goToToday,
    isViewingToday,
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

    switch (calendarView) {
      case "daily":
        return <DailyCalendar {...commonProps} {...navigationProps} />;
      case "weekly":
        return <WeeklyCalendar {...commonProps} {...navigationProps} />;
      case "monthly":
        return (
          <MonthlyCalendar
            {...commonProps}
            {...navigationProps}
            onDateSelect={selectDateAndSwitchToDaily}
          />
        );
      case "schedule":
        return <ScheduleCalendar {...commonProps} />;
      default:
        return <WeeklyCalendar {...commonProps} {...navigationProps} />;
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-3 bg-card border-b border-border">
        <CalendarViewSwitcher />
        <FamilyFilterPills />
      </div>

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

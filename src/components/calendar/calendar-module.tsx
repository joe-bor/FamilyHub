import {
  addDays,
  endOfMonth,
  endOfWeek,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { Profiler, useMemo } from "react";
import { useCalendarEvents, useCreateEvent, useDeleteEvent } from "@/api";
import {
  AddEventButton,
  CalendarViewSwitcher,
  DailyCalendar,
  EventDetailModal,
  EventFormModal,
  FamilyFilterPills,
  MonthlyCalendar,
  ScheduleCalendar,
  WeeklyCalendar,
} from "@/components/calendar";
import { logProfilerData } from "@/lib/perf-utils";
import type { CalendarEvent, CreateEventRequest } from "@/lib/types";
import type { EventFormData } from "@/lib/validations";
import {
  useCalendarActions,
  useCalendarState,
  useEventDetailState,
  useIsViewingToday,
} from "@/stores";

// Helper to format time consistently (24h -> 12h AM/PM)
function formatTime(time: string): string {
  const [hours, minutes] = time.split(":");
  const hour = Number.parseInt(hours, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

export function CalendarModule() {
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
    if (selectedEvent) {
      deleteEvent.mutate(selectedEvent.id);
    }
  };

  const handleEditClick = () => {
    // Will be implemented in next commit with edit modal integration
  };

  const handleAddEvent = (formData: EventFormData) => {
    const request: CreateEventRequest = {
      title: formData.title,
      startTime: formatTime(formData.startTime),
      endTime: formatTime(formData.endTime),
      date: parseISO(formData.date).toISOString(),
      memberId: formData.memberId,
      isAllDay: formData.isAllDay,
      location: formData.location,
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
    <Profiler id="CalendarModule" onRender={logProfilerData}>
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

        {/* Event Detail Modal */}
        <EventDetailModal
          event={selectedEvent}
          isOpen={isDetailModalOpen}
          onClose={closeDetailModal}
          onEdit={handleEditClick}
          onDelete={handleDeleteEvent}
          isDeleting={deleteEvent.isPending}
          deleteError={deleteEvent.error?.message}
        />
      </div>
    </Profiler>
  );
}

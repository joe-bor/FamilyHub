import {
  WeeklyCalendar,
  DailyCalendar,
  MonthlyCalendar,
  ScheduleCalendar,
  AddEventButton,
  AddEventModal,
  CalendarViewSwitcher,
  FamilyFilterPills,
} from "@/components/calendar"
import { useCalendarStore, useIsViewingToday } from "@/stores"
import type { CalendarEvent } from "@/lib/types"

export function CalendarModule() {
  // Get state from store
  const currentDate = useCalendarStore((state) => state.currentDate)
  const calendarView = useCalendarStore((state) => state.calendarView)
  const events = useCalendarStore((state) => state.events)
  const filter = useCalendarStore((state) => state.filter)
  const isAddEventModalOpen = useCalendarStore((state) => state.isAddEventModalOpen)
  const isViewingToday = useIsViewingToday()

  // Get actions from store
  const goToToday = useCalendarStore((state) => state.goToToday)
  const goToPrevious = useCalendarStore((state) => state.goToPrevious)
  const goToNext = useCalendarStore((state) => state.goToNext)
  const selectDateAndSwitchToDaily = useCalendarStore((state) => state.selectDateAndSwitchToDaily)
  const addEvent = useCalendarStore((state) => state.addEvent)
  const openAddEventModal = useCalendarStore((state) => state.openAddEventModal)
  const closeAddEventModal = useCalendarStore((state) => state.closeAddEventModal)

  const handleEventClick = (event: CalendarEvent) => {
    console.log("Event clicked:", event)
    // Future: Open event detail modal
  }

  const commonProps = {
    events,
    currentDate,
    onEventClick: handleEventClick,
    filter,
  }

  const navigationProps = {
    onPrevious: goToPrevious,
    onNext: goToNext,
    onToday: goToToday,
    isViewingToday,
  }

  const renderCalendarView = () => {
    switch (calendarView) {
      case "daily":
        return <DailyCalendar {...commonProps} {...navigationProps} />
      case "weekly":
        return <WeeklyCalendar {...commonProps} {...navigationProps} />
      case "monthly":
        return (
          <MonthlyCalendar
            {...commonProps}
            {...navigationProps}
            onDateSelect={selectDateAndSwitchToDaily}
          />
        )
      case "schedule":
        return <ScheduleCalendar {...commonProps} />
      default:
        return <WeeklyCalendar {...commonProps} {...navigationProps} />
    }
  }

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

      {/* Modal */}
      <AddEventModal
        isOpen={isAddEventModalOpen}
        onClose={closeAddEventModal}
        onAdd={addEvent}
      />
    </div>
  )
}

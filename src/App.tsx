import { useState } from "react"
import { CalendarHeader } from "@/components/calendar-header"
import { NavigationTabs, type TabType } from "@/components/navigation-tabs"
import { WeeklyCalendar } from "@/components/weekly-calendar"
import { DailyCalendar } from "@/components/daily-calendar"
import { MonthlyCalendar } from "@/components/monthly-calendar"
import { ScheduleCalendar } from "@/components/schedule-calendar"
import { AddEventButton } from "@/components/add-event-button"
import { AddEventModal } from "@/components/add-event-modal"
import { SidebarMenu } from "@/components/sidebar-menu"
import { ChoresView } from "@/components/chores-view"
import { MealsView } from "@/components/meals-view"
import { ListsView } from "@/components/lists-view"
import { PhotosView } from "@/components/photos-view"
import { CalendarViewSwitcher, type CalendarViewType } from "@/components/calendar-view-switcher"
import type { FilterState } from "@/components/calendar-filter"
import { FamilyFilterPills } from "@/components/family-filter-pills"
import { TodayButton } from "@/components/today-button"
import { type CalendarEvent, generateSampleEvents, familyMembers } from "@/lib/calendar-data"

export default function FamilyHub() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [activeTab, setActiveTab] = useState<TabType>("calendar")
  const [calendarView, setCalendarView] = useState<CalendarViewType>("weekly")
  const [isAddEventOpen, setIsAddEventOpen] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [events, setEvents] = useState<CalendarEvent[]>(() => generateSampleEvents())

  const [filter, setFilter] = useState<FilterState>({
    selectedMembers: familyMembers.map((m) => m.id),
    showAllDayEvents: true,
  })

  const familyName = "Miller"

  const isViewingToday = () => {
    const today = new Date()
    switch (calendarView) {
      case "daily":
        return currentDate.toDateString() === today.toDateString()
      case "weekly": {
        const startOfWeek = new Date(currentDate)
        startOfWeek.setDate(currentDate.getDate() - currentDate.getDay())
        const endOfWeek = new Date(startOfWeek)
        endOfWeek.setDate(startOfWeek.getDate() + 6)
        return today >= startOfWeek && today <= endOfWeek
      }
      case "monthly":
        return currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear()
      default:
        return true
    }
  }

  const handleGoToToday = () => {
    setCurrentDate(new Date())
  }

  const handlePrev = () => {
    const newDate = new Date(currentDate)
    switch (calendarView) {
      case "daily":
        newDate.setDate(currentDate.getDate() - 1)
        break
      case "weekly":
        newDate.setDate(currentDate.getDate() - 7)
        break
      case "monthly":
        newDate.setMonth(currentDate.getMonth() - 1)
        break
      case "schedule":
        newDate.setDate(currentDate.getDate() - 7)
        break
    }
    setCurrentDate(newDate)
  }

  const handleNext = () => {
    const newDate = new Date(currentDate)
    switch (calendarView) {
      case "daily":
        newDate.setDate(currentDate.getDate() + 1)
        break
      case "weekly":
        newDate.setDate(currentDate.getDate() + 7)
        break
      case "monthly":
        newDate.setMonth(currentDate.getMonth() + 1)
        break
      case "schedule":
        newDate.setDate(currentDate.getDate() + 7)
        break
    }
    setCurrentDate(newDate)
  }

  const handleDateSelect = (date: Date) => {
    setCurrentDate(date)
    setCalendarView("daily")
  }

  const handleAddEvent = (newEvent: Omit<CalendarEvent, "id">) => {
    const event: CalendarEvent = {
      ...newEvent,
      id: `event-${Date.now()}`,
      startTime: formatTime(newEvent.startTime),
      endTime: formatTime(newEvent.endTime),
    }
    setEvents((prev) => [...prev, event])
  }

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":")
    const hour = Number.parseInt(hours)
    const ampm = hour >= 12 ? "PM" : "AM"
    const hour12 = hour % 12 || 12
    return `${hour12}:${minutes} ${ampm}`
  }

  const renderCalendarView = () => {
    const commonProps = {
      events,
      currentDate,
      onEventClick: (event: CalendarEvent) => console.log("Event clicked:", event),
      filter,
    }

    switch (calendarView) {
      case "daily":
        return <DailyCalendar {...commonProps} />
      case "weekly":
        return <WeeklyCalendar {...commonProps} />
      case "monthly":
        return (
          <MonthlyCalendar
            {...commonProps}
            onDateSelect={handleDateSelect}
            onPrevMonth={handlePrev}
            onNextMonth={handleNext}
          />
        )
      case "schedule":
        return <ScheduleCalendar {...commonProps} />
      default:
        return <WeeklyCalendar {...commonProps} />
    }
  }

  const showTodayButton = calendarView === "monthly"

  const renderContent = () => {
    switch (activeTab) {
      case "calendar":
        return (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-3 bg-card border-b border-border">
              <div className="flex items-center gap-3">
                <CalendarViewSwitcher view={calendarView} onViewChange={setCalendarView} />
                {showTodayButton && <TodayButton onClick={handleGoToToday} isToday={isViewingToday()} />}
              </div>
              <div className="flex items-center gap-3">
                <FamilyFilterPills filter={filter} onFilterChange={setFilter} />
              </div>
            </div>
            {renderCalendarView()}
            <AddEventButton onClick={() => setIsAddEventOpen(true)} />
          </div>
        )
      case "chores":
        return <ChoresView />
      case "meals":
        return <MealsView />
      case "lists":
        return <ListsView />
      case "photos":
        return <PhotosView />
      default:
        return null
    }
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <CalendarHeader
        currentDate={currentDate}
        familyName={familyName}
        onPrevWeek={handlePrev}
        onNextWeek={handleNext}
        onMenuClick={() => setIsSidebarOpen(true)}
      />

      <div className="flex-1 flex overflow-hidden">
        <NavigationTabs activeTab={activeTab} onTabChange={setActiveTab} />
        <main className="flex-1 flex flex-col overflow-hidden">{renderContent()}</main>
      </div>

      <AddEventModal isOpen={isAddEventOpen} onClose={() => setIsAddEventOpen(false)} onAdd={handleAddEvent} />

      <SidebarMenu isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} familyName={familyName} />
    </div>
  )
}

import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { CalendarEvent, CalendarViewType, FilterState } from "@/lib/types"
import { generateSampleEvents } from "@/lib/calendar-data"
import { familyMembers } from "@/lib/types"

interface CalendarState {
  // State
  currentDate: Date
  calendarView: CalendarViewType
  events: CalendarEvent[]
  filter: FilterState
  isAddEventModalOpen: boolean

  // Navigation actions
  goToToday: () => void
  goToPrevious: () => void
  goToNext: () => void
  setDate: (date: Date) => void
  selectDateAndSwitchToDaily: (date: Date) => void

  // View actions
  setCalendarView: (view: CalendarViewType) => void

  // Event CRUD
  addEvent: (event: Omit<CalendarEvent, "id">) => void
  updateEvent: (id: string, updates: Partial<CalendarEvent>) => void
  deleteEvent: (id: string) => void

  // Filter actions
  setFilter: (filter: FilterState) => void
  toggleMember: (memberId: string) => void
  toggleAllMembers: () => void
  toggleAllDayEvents: () => void

  // Modal actions
  openAddEventModal: () => void
  closeAddEventModal: () => void
}

// Helper to format time consistently
const formatTime = (time: string): string => {
  const [hours, minutes] = time.split(":")
  const hour = Number.parseInt(hours)
  const ampm = hour >= 12 ? "PM" : "AM"
  const hour12 = hour % 12 || 12
  return `${hour12}:${minutes} ${ampm}`
}

export const useCalendarStore = create<CalendarState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentDate: new Date(),
      calendarView: "weekly",
      events: generateSampleEvents(),
      filter: {
        selectedMembers: familyMembers.map((m) => m.id),
        showAllDayEvents: true,
      },
      isAddEventModalOpen: false,

      // Navigation actions
      goToToday: () => set({ currentDate: new Date() }),

      goToPrevious: () => {
        const { currentDate, calendarView } = get()
        const newDate = new Date(currentDate)

        switch (calendarView) {
          case "daily":
            newDate.setDate(currentDate.getDate() - 1)
            break
          case "weekly":
          case "schedule":
            newDate.setDate(currentDate.getDate() - 7)
            break
          case "monthly":
            newDate.setMonth(currentDate.getMonth() - 1)
            break
        }

        set({ currentDate: newDate })
      },

      goToNext: () => {
        const { currentDate, calendarView } = get()
        const newDate = new Date(currentDate)

        switch (calendarView) {
          case "daily":
            newDate.setDate(currentDate.getDate() + 1)
            break
          case "weekly":
          case "schedule":
            newDate.setDate(currentDate.getDate() + 7)
            break
          case "monthly":
            newDate.setMonth(currentDate.getMonth() + 1)
            break
        }

        set({ currentDate: newDate })
      },

      setDate: (date) => set({ currentDate: date }),

      selectDateAndSwitchToDaily: (date) =>
        set({
          currentDate: date,
          calendarView: "daily",
        }),

      // View actions
      setCalendarView: (view) => set({ calendarView: view }),

      // Event CRUD
      addEvent: (eventData) => {
        const event: CalendarEvent = {
          ...eventData,
          id: `event-${Date.now()}`,
          startTime: formatTime(eventData.startTime),
          endTime: formatTime(eventData.endTime),
        }
        set((state) => ({ events: [...state.events, event] }))
      },

      updateEvent: (id, updates) => {
        set((state) => ({
          events: state.events.map((event) =>
            event.id === id ? { ...event, ...updates } : event
          ),
        }))
      },

      deleteEvent: (id) => {
        set((state) => ({
          events: state.events.filter((event) => event.id !== id),
        }))
      },

      // Filter actions
      setFilter: (filter) => set({ filter }),

      toggleMember: (memberId) => {
        const { filter } = get()
        const isSelected = filter.selectedMembers.includes(memberId)
        const newSelectedMembers = isSelected
          ? filter.selectedMembers.filter((id) => id !== memberId)
          : [...filter.selectedMembers, memberId]

        set({ filter: { ...filter, selectedMembers: newSelectedMembers } })
      },

      toggleAllMembers: () => {
        const { filter } = get()
        const allSelected = filter.selectedMembers.length === familyMembers.length

        set({
          filter: {
            ...filter,
            selectedMembers: allSelected ? [] : familyMembers.map((m) => m.id),
          },
        })
      },

      toggleAllDayEvents: () => {
        const { filter } = get()
        set({ filter: { ...filter, showAllDayEvents: !filter.showAllDayEvents } })
      },

      // Modal actions
      openAddEventModal: () => set({ isAddEventModalOpen: true }),
      closeAddEventModal: () => set({ isAddEventModalOpen: false }),
    }),
    {
      name: "family-hub-calendar",
      // Only persist filter preferences (avoid Date serialization issues)
      partialize: (state) => ({ filter: state.filter }),
    }
  )
)

// Computed selector: isViewingToday
export const useIsViewingToday = () =>
  useCalendarStore((state) => {
    const { currentDate, calendarView } = state
    const today = new Date()

    switch (calendarView) {
      case "daily":
        return currentDate.toDateString() === today.toDateString()
      case "weekly":
      case "schedule": {
        const startOfWeek = new Date(currentDate)
        startOfWeek.setDate(currentDate.getDate() - currentDate.getDay())
        const endOfWeek = new Date(startOfWeek)
        endOfWeek.setDate(startOfWeek.getDate() + 6)
        return today >= startOfWeek && today <= endOfWeek
      }
      case "monthly":
        return (
          currentDate.getMonth() === today.getMonth() &&
          currentDate.getFullYear() === today.getFullYear()
        )
      default:
        return true
    }
  })

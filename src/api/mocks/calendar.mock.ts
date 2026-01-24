import { isWithinInterval, parseISO, startOfDay } from "date-fns";
import { ApiErrorCode, ApiException } from "@/api/client";
import { parseLocalDate } from "@/lib/time-utils";
import type {
  ApiResponse,
  CalendarEvent,
  CreateEventRequest,
  GetEventsParams,
  UpdateEventRequest,
} from "@/lib/types";
import { simulateApiCall } from "./delay";

// localStorage keys
const STORAGE_KEY = "family-hub-calendar-events";
const FAMILY_STORAGE_KEY = "family-hub-family";

// Event templates for generating sample data (memberId assigned dynamically)
const eventTemplates = [
  { title: "Coffee with Diana", startTime: "9:00 AM", endTime: "10:00 AM" },
  { title: "Pickup Day Cleaning", startTime: "8:00 AM", endTime: "9:00 AM" },
  { title: "Soccer Practice", startTime: "4:00 PM", endTime: "5:30 PM" },
  { title: "Emma's Birthday Party", startTime: "2:00 PM", endTime: "5:00 PM" },
  { title: "Grocery Run", startTime: "11:00 AM", endTime: "12:00 PM" },
  { title: "Dogo's Bath Day!", startTime: "10:00 AM", endTime: "11:00 AM" },
  { title: "Amelia's Baby Shower", startTime: "1:00 PM", endTime: "3:00 PM" },
  { title: "Tutoring", startTime: "3:30 PM", endTime: "4:30 PM" },
  { title: "Mincey Toss", startTime: "9:00 AM", endTime: "10:00 AM" },
  {
    title: "House Cleaner Estimate",
    startTime: "10:00 AM",
    endTime: "11:00 AM",
  },
  { title: "Dance Group", startTime: "5:00 PM", endTime: "6:30 PM" },
  { title: "Lunch With Mom", startTime: "12:00 PM", endTime: "1:30 PM" },
  { title: "Harvest Festival", startTime: "10:00 AM", endTime: "2:00 PM" },
  { title: "Pop Rally", startTime: "2:00 PM", endTime: "3:00 PM" },
  { title: "Volleyball Practice", startTime: "4:00 PM", endTime: "5:30 PM" },
  { title: "Math Tutoring", startTime: "3:00 PM", endTime: "4:00 PM" },
  { title: "Luna Vet Checkup", startTime: "2:00 PM", endTime: "3:00 PM" },
  { title: "Volleyball Game", startTime: "6:00 PM", endTime: "8:00 PM" },
  { title: "Reading Time", startTime: "7:00 PM", endTime: "8:00 PM" },
];

// Get family member IDs from localStorage
function getFamilyMemberIds(): string[] {
  try {
    const stored = localStorage.getItem(FAMILY_STORAGE_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored);
    const members = parsed?.state?.family?.members;
    if (!Array.isArray(members)) return [];

    return members.map((m: { id: string }) => m.id);
  } catch {
    return [];
  }
}

function generateSampleEvents(): CalendarEvent[] {
  const memberIds = getFamilyMemberIds();

  // Don't generate sample events if no family members exist yet
  if (memberIds.length === 0) {
    return [];
  }

  const today = new Date();
  const events: CalendarEvent[] = [];

  // Helper to pick a random member
  const getRandomMemberId = () =>
    memberIds[Math.floor(Math.random() * memberIds.length)];

  // Distribute events across the week
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - today.getDay() + i + 3); // Start from Wednesday

    // Add 2-4 random events per day
    const numEvents = Math.floor(Math.random() * 3) + 2;
    const shuffled = [...eventTemplates].sort(() => Math.random() - 0.5);

    for (let j = 0; j < numEvents && j < shuffled.length; j++) {
      const template = shuffled[j];
      events.push({
        id: `event-${i}-${j}`,
        title: template.title,
        startTime: template.startTime,
        endTime: template.endTime,
        date: new Date(date),
        memberId: getRandomMemberId(),
      });
    }
  }

  return events;
}

// Persistence helpers
function saveEventsToStorage(events: CalendarEvent[]): void {
  try {
    // Serialize events, converting Date objects to ISO strings
    const serialized = events.map((event) => ({
      ...event,
      date: event.date instanceof Date ? event.date.toISOString() : event.date,
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
  } catch (error) {
    console.error("Failed to save calendar events to localStorage:", error);
  }
}

function loadEventsFromStorage(): CalendarEvent[] | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored) as Array<
      CalendarEvent & { date: string }
    >;
    // Deserialize: convert ISO date strings back to Date objects
    return parsed.map((event) => ({
      ...event,
      date: new Date(event.date),
    }));
  } catch (error) {
    console.error("Failed to load calendar events from localStorage:", error);
    return null;
  }
}

function initializeMockEvents(): CalendarEvent[] {
  // Try to load from localStorage first
  const stored = loadEventsFromStorage();
  if (stored && stored.length > 0) {
    return stored;
  }
  // Try to generate sample events (requires family to exist)
  const generated = generateSampleEvents();
  if (generated.length > 0) {
    saveEventsToStorage(generated);
  }
  return generated;
}

// Lazy initialization: generate sample events if empty and family now exists
function ensureSampleEventsExist(): void {
  if (mockEvents.length === 0) {
    const generated = generateSampleEvents();
    if (generated.length > 0) {
      mockEvents = generated;
      saveEventsToStorage(mockEvents);
    }
  }
}

// In-memory storage for mock data (initialized from localStorage or generated)
let mockEvents: CalendarEvent[] = initializeMockEvents();

function createApiResponse<T>(data: T, message?: string): ApiResponse<T> {
  return message ? { data, message } : { data };
}

export const calendarMockHandlers = {
  async getEvents(
    params?: GetEventsParams,
  ): Promise<ApiResponse<CalendarEvent[]>> {
    await simulateApiCall();

    // Lazy init: generate sample events if family was created after module load
    ensureSampleEventsExist();

    let events = [...mockEvents];

    // Apply date range filter
    // Use date-fns to normalize dates and avoid timezone issues
    if (params?.startDate && params?.endDate) {
      // Parse ISO date strings and normalize to start of day in local timezone
      const start = startOfDay(parseISO(params.startDate));
      const end = startOfDay(parseISO(params.endDate));

      events = events.filter((e) => {
        const eventDate = startOfDay(new Date(e.date));
        return isWithinInterval(eventDate, { start, end });
      });
    } else if (params?.startDate) {
      const start = startOfDay(parseISO(params.startDate));
      events = events.filter((e) => startOfDay(new Date(e.date)) >= start);
    } else if (params?.endDate) {
      const end = startOfDay(parseISO(params.endDate));
      events = events.filter((e) => startOfDay(new Date(e.date)) <= end);
    }

    // Apply member filter
    if (params?.memberId) {
      events = events.filter((e) => e.memberId === params.memberId);
    }

    return createApiResponse(events);
  },

  async getEventById(id: string): Promise<ApiResponse<CalendarEvent>> {
    await simulateApiCall({ delayMin: 100, delayMax: 300 });

    const event = mockEvents.find((e) => e.id === id);
    if (!event) {
      throw new ApiException({
        code: ApiErrorCode.NOT_FOUND,
        message: `Event with id "${id}" not found`,
        status: 404,
      });
    }

    return createApiResponse(event);
  },

  async createEvent(
    request: CreateEventRequest,
  ): Promise<ApiResponse<CalendarEvent>> {
    await simulateApiCall();

    const newEvent: CalendarEvent = {
      id: `event-${Date.now()}`,
      title: request.title,
      startTime: request.startTime,
      endTime: request.endTime,
      date: parseLocalDate(request.date), // Parse as local date, not UTC
      memberId: request.memberId,
      isAllDay: request.isAllDay,
      location: request.location,
    };

    mockEvents = [...mockEvents, newEvent];
    saveEventsToStorage(mockEvents);

    return createApiResponse(newEvent, "Event created successfully");
  },

  async updateEvent(
    request: UpdateEventRequest,
  ): Promise<ApiResponse<CalendarEvent>> {
    await simulateApiCall();

    const index = mockEvents.findIndex((e) => e.id === request.id);
    if (index === -1) {
      throw new ApiException({
        code: ApiErrorCode.NOT_FOUND,
        message: `Event with id "${request.id}" not found`,
        status: 404,
      });
    }

    const existingEvent = mockEvents[index];
    const updatedEvent: CalendarEvent = {
      ...existingEvent,
      title: request.title ?? existingEvent.title,
      startTime: request.startTime ?? existingEvent.startTime,
      endTime: request.endTime ?? existingEvent.endTime,
      date: request.date ? parseLocalDate(request.date) : existingEvent.date, // Parse as local date, not UTC
      memberId: request.memberId ?? existingEvent.memberId,
      isAllDay: request.isAllDay ?? existingEvent.isAllDay,
      location: request.location ?? existingEvent.location,
    };

    mockEvents = [
      ...mockEvents.slice(0, index),
      updatedEvent,
      ...mockEvents.slice(index + 1),
    ];
    saveEventsToStorage(mockEvents);

    return createApiResponse(updatedEvent, "Event updated successfully");
  },

  async deleteEvent(id: string): Promise<void> {
    await simulateApiCall({ delayMin: 150, delayMax: 350 });

    const index = mockEvents.findIndex((e) => e.id === id);
    if (index === -1) {
      throw new ApiException({
        code: ApiErrorCode.NOT_FOUND,
        message: `Event with id "${id}" not found`,
        status: 404,
      });
    }

    mockEvents = mockEvents.filter((e) => e.id !== id);
    saveEventsToStorage(mockEvents);
  },

  // Utility for resetting mock data (useful for testing)
  resetMockData(): void {
    mockEvents = generateSampleEvents();
    saveEventsToStorage(mockEvents);
  },
};

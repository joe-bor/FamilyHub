import { isWithinInterval, parseISO, startOfDay } from "date-fns";
import { ApiErrorCode, ApiException } from "@/api/client";
import type {
  ApiResponse,
  CalendarEvent,
  CreateEventRequest,
  GetEventsParams,
  MutationResponse,
  UpdateEventRequest,
} from "@/lib/types";
import { simulateApiCall } from "./delay";

// Event templates for generating sample data
const eventTemplates = [
  {
    title: "Coffee with Diana",
    memberId: "1",
    startTime: "9:00 AM",
    endTime: "10:00 AM",
  },
  {
    title: "Pickup Day Cleaning",
    memberId: "6",
    startTime: "8:00 AM",
    endTime: "9:00 AM",
  },
  {
    title: "Soccer Practice",
    memberId: "4",
    startTime: "4:00 PM",
    endTime: "5:30 PM",
  },
  {
    title: "Emma's Birthday Party",
    memberId: "3",
    startTime: "2:00 PM",
    endTime: "5:00 PM",
  },
  {
    title: "Grocery Run",
    memberId: "1",
    startTime: "11:00 AM",
    endTime: "12:00 PM",
  },
  {
    title: "Dogo's Bath Day!",
    memberId: "6",
    startTime: "10:00 AM",
    endTime: "11:00 AM",
  },
  {
    title: "Amelia's Baby Shower",
    memberId: "1",
    startTime: "1:00 PM",
    endTime: "3:00 PM",
  },
  {
    title: "Tutoring",
    memberId: "3",
    startTime: "3:30 PM",
    endTime: "4:30 PM",
  },
  {
    title: "Mincey Toss",
    memberId: "4",
    startTime: "9:00 AM",
    endTime: "10:00 AM",
  },
  {
    title: "House Cleaner Estimate",
    memberId: "2",
    startTime: "10:00 AM",
    endTime: "11:00 AM",
  },
  {
    title: "Dance Group",
    memberId: "5",
    startTime: "5:00 PM",
    endTime: "6:30 PM",
  },
  {
    title: "Lunch With Mom",
    memberId: "1",
    startTime: "12:00 PM",
    endTime: "1:30 PM",
  },
  {
    title: "Harvest Festival",
    memberId: "6",
    startTime: "10:00 AM",
    endTime: "2:00 PM",
  },
  {
    title: "Pop Rally",
    memberId: "3",
    startTime: "2:00 PM",
    endTime: "3:00 PM",
  },
  {
    title: "Volleyball Practice",
    memberId: "3",
    startTime: "4:00 PM",
    endTime: "5:30 PM",
  },
  {
    title: "Math Tutoring",
    memberId: "4",
    startTime: "3:00 PM",
    endTime: "4:00 PM",
  },
  {
    title: "Luna Vet Checkup",
    memberId: "1",
    startTime: "2:00 PM",
    endTime: "3:00 PM",
  },
  {
    title: "Volleyball Game",
    memberId: "3",
    startTime: "6:00 PM",
    endTime: "8:00 PM",
  },
  {
    title: "Reading Time",
    memberId: "5",
    startTime: "7:00 PM",
    endTime: "8:00 PM",
  },
];

function generateSampleEvents(): CalendarEvent[] {
  const today = new Date();
  const events: CalendarEvent[] = [];

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
        memberId: template.memberId,
      });
    }
  }

  return events;
}

// In-memory storage for mock data
let mockEvents: CalendarEvent[] = generateSampleEvents();

function createApiResponse<T>(data: T): ApiResponse<T> {
  return {
    data,
    meta: {
      timestamp: Date.now(),
      requestId: crypto.randomUUID(),
    },
  };
}

function createMutationResponse<T>(
  data: T,
  message: string,
): MutationResponse<T> {
  return { data, message };
}

export const calendarMockHandlers = {
  async getEvents(
    params?: GetEventsParams,
  ): Promise<ApiResponse<CalendarEvent[]>> {
    await simulateApiCall();

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
  ): Promise<MutationResponse<CalendarEvent>> {
    await simulateApiCall();

    const newEvent: CalendarEvent = {
      id: `event-${Date.now()}`,
      title: request.title,
      startTime: request.startTime,
      endTime: request.endTime,
      date: new Date(request.date),
      memberId: request.memberId,
      isAllDay: request.isAllDay,
      location: request.location,
    };

    mockEvents = [...mockEvents, newEvent];

    return createMutationResponse(newEvent, "Event created successfully");
  },

  async updateEvent(
    request: UpdateEventRequest,
  ): Promise<MutationResponse<CalendarEvent>> {
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
      date: request.date ? new Date(request.date) : existingEvent.date,
      memberId: request.memberId ?? existingEvent.memberId,
      isAllDay: request.isAllDay ?? existingEvent.isAllDay,
      location: request.location ?? existingEvent.location,
    };

    mockEvents = [
      ...mockEvents.slice(0, index),
      updatedEvent,
      ...mockEvents.slice(index + 1),
    ];

    return createMutationResponse(updatedEvent, "Event updated successfully");
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
  },

  // Utility for resetting mock data (useful for testing)
  resetMockData(): void {
    mockEvents = generateSampleEvents();
  },
};

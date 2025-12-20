import type { UseQueryOptions } from "@tanstack/react-query";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApiException } from "@/api/client";
import { calendarService } from "@/api/services";
import type {
  ApiResponse,
  CalendarEvent,
  GetEventsParams,
  MutationResponse,
} from "@/lib/types";

// Query keys factory for type-safe cache management
export const calendarKeys = {
  all: ["calendar"] as const,
  events: () => [...calendarKeys.all, "events"] as const,
  eventList: (params?: GetEventsParams) =>
    [...calendarKeys.events(), params] as const,
  event: (id: string) => [...calendarKeys.events(), id] as const,
};

// Queries

export function useCalendarEvents(
  params?: GetEventsParams,
  options?: Omit<
    UseQueryOptions<ApiResponse<CalendarEvent[]>, ApiException>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: calendarKeys.eventList(params),
    queryFn: () => calendarService.getEvents(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

export function useCalendarEvent(
  id: string,
  options?: Omit<
    UseQueryOptions<ApiResponse<CalendarEvent>, ApiException>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: calendarKeys.event(id),
    queryFn: () => calendarService.getEventById(id),
    enabled: !!id,
    ...options,
  });
}

// Mutations

interface CreateEventCallbacks {
  onSuccess?: (data: MutationResponse<CalendarEvent>) => void;
  onError?: (error: ApiException) => void;
}

export function useCreateEvent(callbacks?: CreateEventCallbacks) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: calendarService.createEvent,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: calendarKeys.events() });
      callbacks?.onSuccess?.(data);
    },
    onError: (error: ApiException) => {
      callbacks?.onError?.(error);
    },
  });
}

interface UpdateEventCallbacks {
  onSuccess?: (data: MutationResponse<CalendarEvent>) => void;
  onError?: (error: ApiException) => void;
}

export function useUpdateEvent(callbacks?: UpdateEventCallbacks) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: calendarService.updateEvent,
    // Optimistic update
    onMutate: async (updatedEvent) => {
      await queryClient.cancelQueries({ queryKey: calendarKeys.events() });

      const previousData = queryClient.getQueriesData<
        ApiResponse<CalendarEvent[]>
      >({
        queryKey: calendarKeys.events(),
      });

      queryClient.setQueriesData<ApiResponse<CalendarEvent[]>>(
        { queryKey: calendarKeys.events() },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((event) =>
              event.id === updatedEvent.id
                ? {
                    ...event,
                    ...updatedEvent,
                    date: updatedEvent.date
                      ? new Date(updatedEvent.date)
                      : event.date,
                  }
                : event,
            ),
          };
        },
      );

      return { previousData };
    },
    onError: (error: ApiException, _updatedEvent, context) => {
      // Rollback on error
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      callbacks?.onError?.(error);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: calendarKeys.events() });
    },
    onSuccess: (data) => {
      callbacks?.onSuccess?.(data);
    },
  });
}

interface DeleteEventCallbacks {
  onSuccess?: () => void;
  onError?: (error: ApiException) => void;
}

export function useDeleteEvent(callbacks?: DeleteEventCallbacks) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: calendarService.deleteEvent,
    // Optimistic delete
    onMutate: async (eventId) => {
      await queryClient.cancelQueries({ queryKey: calendarKeys.events() });

      const previousData = queryClient.getQueriesData<
        ApiResponse<CalendarEvent[]>
      >({
        queryKey: calendarKeys.events(),
      });

      queryClient.setQueriesData<ApiResponse<CalendarEvent[]>>(
        { queryKey: calendarKeys.events() },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.filter((event) => event.id !== eventId),
          };
        },
      );

      return { previousData };
    },
    onError: (error: ApiException, _eventId, context) => {
      // Rollback on error
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      callbacks?.onError?.(error);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: calendarKeys.events() });
    },
    onSuccess: () => {
      callbacks?.onSuccess?.();
    },
  });
}

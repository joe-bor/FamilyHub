import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { mealsService } from "@/api/services";
import type {
  DuplicateMealSlotRequest,
  MealBoardApiResponse,
  MealSlot,
  MealSlotApiResponse,
  MoveMealSlotRequest,
  RemoveMealSlotRequest,
  UpsertMealSlotRequest,
} from "@/lib/types";

export const mealsKeys = {
  all: ["meals"] as const,
  board: (weekStartDate: string) =>
    [...mealsKeys.all, "board", weekStartDate] as const,
};

function replaceSlotInBoard(
  previous: MealBoardApiResponse | undefined,
  updatedSlot: MealSlot,
): MealBoardApiResponse | undefined {
  if (!previous) return previous;

  return {
    ...previous,
    data: {
      ...previous.data,
      days: previous.data.days.map((day) =>
        day.dayIndex === updatedSlot.dayIndex
          ? {
              ...day,
              slots: day.slots.map((slot) =>
                slot.mealType === updatedSlot.mealType ? updatedSlot : slot,
              ),
            }
          : day,
      ),
    },
  };
}

function invalidateBoard(
  queryClient: ReturnType<typeof useQueryClient>,
  weekStartDate: string,
) {
  queryClient.invalidateQueries({ queryKey: mealsKeys.board(weekStartDate) });
}

function cacheBoard(
  queryClient: ReturnType<typeof useQueryClient>,
  response: MealBoardApiResponse,
) {
  queryClient.setQueryData(
    mealsKeys.board(response.data.weekStartDate),
    response,
  );
}

export function useMealsBoard(weekStartDate: string) {
  return useQuery({
    queryKey: mealsKeys.board(weekStartDate),
    queryFn: () => mealsService.getBoard(weekStartDate),
  });
}

export function useUpsertMealSlot(callbacks?: {
  onSuccess?: (data: MealSlotApiResponse) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: UpsertMealSlotRequest) =>
      mealsService.upsertSlot(request),
    onSuccess: (response, request) => {
      queryClient.setQueryData<MealBoardApiResponse>(
        mealsKeys.board(request.weekStartDate),
        (previous) => replaceSlotInBoard(previous, response.data),
      );
      invalidateBoard(queryClient, request.weekStartDate);
      callbacks?.onSuccess?.(response);
    },
    onError: (error) => {
      callbacks?.onError?.(
        error instanceof Error ? error : new Error(String(error)),
      );
    },
  });
}

export function useMoveMealSlot(callbacks?: {
  onSuccess?: (data: MealBoardApiResponse) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: MoveMealSlotRequest) =>
      mealsService.moveSlot(request),
    onSuccess: (response, request) => {
      cacheBoard(queryClient, response);
      invalidateBoard(queryClient, request.sourceWeekStartDate);
      invalidateBoard(queryClient, request.destinationWeekStartDate);
      callbacks?.onSuccess?.(response);
    },
    onError: (error) => {
      callbacks?.onError?.(
        error instanceof Error ? error : new Error(String(error)),
      );
    },
  });
}

export function useDuplicateMealSlot(callbacks?: {
  onSuccess?: (data: MealBoardApiResponse) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: DuplicateMealSlotRequest) =>
      mealsService.duplicateSlot(request),
    onSuccess: (response, request) => {
      cacheBoard(queryClient, response);
      invalidateBoard(queryClient, request.sourceWeekStartDate);
      invalidateBoard(queryClient, request.destinationWeekStartDate);
      callbacks?.onSuccess?.(response);
    },
    onError: (error) => {
      callbacks?.onError?.(
        error instanceof Error ? error : new Error(String(error)),
      );
    },
  });
}

export function useRemoveMealSlot(callbacks?: {
  onSuccess?: (data: MealBoardApiResponse) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: RemoveMealSlotRequest) =>
      mealsService.removeSlot(request),
    onSuccess: (response, request) => {
      cacheBoard(queryClient, response);
      invalidateBoard(queryClient, request.weekStartDate);
      callbacks?.onSuccess?.(response);
    },
    onError: (error) => {
      callbacks?.onError?.(
        error instanceof Error ? error : new Error(String(error)),
      );
    },
  });
}

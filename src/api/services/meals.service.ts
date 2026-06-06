import { httpClient } from "@/api/client";
import type {
  DuplicateMealSlotRequest,
  MealBoardApiResponse,
  MealSlotApiResponse,
  MoveMealSlotRequest,
  RemoveMealSlotRequest,
  UpsertMealSlotRequest,
} from "@/lib/types";

export const mealsService = {
  getBoard(weekStartDate: string): Promise<MealBoardApiResponse> {
    return httpClient.get<MealBoardApiResponse>("/meals/board", {
      params: { weekStartDate },
    });
  },

  upsertSlot(request: UpsertMealSlotRequest): Promise<MealSlotApiResponse> {
    return httpClient.put<MealSlotApiResponse>("/meals/slots", request);
  },

  moveSlot(request: MoveMealSlotRequest): Promise<MealBoardApiResponse> {
    return httpClient.post<MealBoardApiResponse>("/meals/slots/move", request);
  },

  duplicateSlot(
    request: DuplicateMealSlotRequest,
  ): Promise<MealBoardApiResponse> {
    return httpClient.post<MealBoardApiResponse>(
      "/meals/slots/duplicate",
      request,
    );
  },

  removeSlot(request: RemoveMealSlotRequest): Promise<MealBoardApiResponse> {
    return httpClient.delete<MealBoardApiResponse>("/meals/slots", undefined, {
      params: {
        weekStartDate: request.weekStartDate,
        dayIndex: request.dayIndex,
        mealType: request.mealType,
      },
    });
  },
};

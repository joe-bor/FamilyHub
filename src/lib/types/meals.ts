import type { ApiResponse } from "./api-response";

export type MealType = "breakfast" | "lunch" | "dinner";
export type MealEntrySourceType = "recipe" | "quick";
export type MealSlotRole = "primary" | "extra";
export type MealCollisionMode = "replace_primary" | "add_as_extra";

export interface MealSlotEntry {
  id: string;
  role: MealSlotRole;
  sourceType: MealEntrySourceType;
  recipeId: string | null;
  title: string;
  imageUrl: string | null;
  note: string | null;
}

export interface MealSlot {
  id: string | null;
  weekStartDate: string;
  dayIndex: number;
  mealType: MealType;
  primary: MealSlotEntry | null;
  extras: MealSlotEntry[];
  note: string | null;
}

export interface MealDay {
  date: string;
  dayIndex: number;
  slots: MealSlot[];
}

export interface MealBoard {
  weekStartDate: string;
  days: MealDay[];
}

export interface MealEntryRequest {
  sourceType: MealEntrySourceType;
  recipeId: string | null;
  title: string | null;
  imageUrl: string | null;
  note: string | null;
}

export interface UpsertMealSlotRequest {
  weekStartDate: string;
  dayIndex: number;
  mealType: MealType;
  primary: MealEntryRequest;
  extras: MealEntryRequest[];
  note: string | null;
  collisionMode: MealCollisionMode | null;
}

export interface MoveMealSlotRequest {
  sourceWeekStartDate: string;
  sourceDayIndex: number;
  sourceMealType: MealType;
  destinationWeekStartDate: string;
  destinationDayIndex: number;
  destinationMealType: MealType;
  collisionMode: MealCollisionMode;
}

export type DuplicateMealSlotRequest = MoveMealSlotRequest;

export interface RemoveMealSlotRequest {
  weekStartDate: string;
  dayIndex: number;
  mealType: MealType;
}

export type MealBoardApiResponse = ApiResponse<MealBoard>;
export type MealSlotApiResponse = ApiResponse<MealSlot>;

export interface MealPlan {
  id: string;
  date: Date;
  breakfast?: string;
  lunch?: string;
  dinner?: string;
  notes?: string;
}

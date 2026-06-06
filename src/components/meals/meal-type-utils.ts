import type { MealSlot } from "@/lib/types";

export function formatMealType(mealType: MealSlot["mealType"]): string {
  return mealType.charAt(0).toUpperCase() + mealType.slice(1);
}

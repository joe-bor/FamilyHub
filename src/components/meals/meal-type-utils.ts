import { CookingPot, Croissant, type LucideIcon, Sandwich } from "lucide-react";
import type { MealSlot } from "@/lib/types";

export function formatMealType(mealType: MealSlot["mealType"]): string {
  return mealType.charAt(0).toUpperCase() + mealType.slice(1);
}

const MEAL_TYPE_ICONS: Record<MealSlot["mealType"], LucideIcon> = {
  breakfast: Croissant,
  lunch: Sandwich,
  dinner: CookingPot,
};

export function mealTypeIcon(mealType: MealSlot["mealType"]): LucideIcon {
  return MEAL_TYPE_ICONS[mealType];
}

// Tailwind can't see interpolated class names, so each full class string is
// written out literally.
const MEAL_TYPE_BAND_CLASSES: Record<MealSlot["mealType"], string> = {
  breakfast: "bg-meal-breakfast text-meal-breakfast-foreground",
  lunch: "bg-meal-lunch text-meal-lunch-foreground",
  dinner: "bg-meal-dinner text-meal-dinner-foreground",
};

export function mealTypeBandClasses(mealType: MealSlot["mealType"]): string {
  return MEAL_TYPE_BAND_CLASSES[mealType];
}

const MEAL_TYPE_RAIL_CLASSES: Record<MealSlot["mealType"], string> = {
  breakfast: "text-meal-breakfast-foreground",
  lunch: "text-meal-lunch-foreground",
  dinner: "text-meal-dinner-foreground",
};

export function mealTypeRailClasses(mealType: MealSlot["mealType"]): string {
  return MEAL_TYPE_RAIL_CLASSES[mealType];
}

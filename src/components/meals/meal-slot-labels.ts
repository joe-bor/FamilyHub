import type { MealSlot } from "@/lib/types";

interface FilledSlotLabelInput {
  mealType: MealSlot["mealType"];
  dayLabel?: string;
  draftTitle: string | null;
  primaryTitle: string | null;
  firstExtraTitle: string | null;
}

interface EmptySlotLabelInput {
  mealType: MealSlot["mealType"];
  dayLabel?: string;
  hasPendingRecipe: boolean;
}

function dayContext(dayLabel?: string) {
  return dayLabel ? `, ${dayLabel}` : "";
}

export function filledSlotLabel({
  mealType,
  dayLabel,
  draftTitle,
  primaryTitle,
  firstExtraTitle,
}: FilledSlotLabelInput): string {
  const context = dayContext(dayLabel);
  if (draftTitle !== null) {
    return `Draft ${mealType}${context}: ${draftTitle}`;
  }
  if (primaryTitle !== null) {
    return `Open ${mealType}${context}: ${primaryTitle}`;
  }
  if (firstExtraTitle) {
    return `Open ${mealType}${context}: extras - ${firstExtraTitle}`;
  }
  return `Open ${mealType}${context}: extras`;
}

export function emptySlotLabel({
  mealType,
  dayLabel,
  hasPendingRecipe,
}: EmptySlotLabelInput): string {
  const context = dayContext(dayLabel);
  return hasPendingRecipe
    ? `Add recipe to ${mealType}${context}`
    : `Add ${mealType} meal${context}`;
}

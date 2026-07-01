import { parseLocalDate } from "@/lib/time-utils";
import type { MealDay, MealSlot } from "@/lib/types";
import type {
  MealPlanningDraft,
  MealPlanningTarget,
} from "./meal-planning-session";
import { MealSlotCard } from "./meal-slot-card";

function formatDayLabel(date: string) {
  return parseLocalDate(date).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

interface MealDayCardProps {
  day: MealDay;
  readOnly: boolean;
  pendingRecipeId?: string | null;
  planningDrafts?: MealPlanningDraft[];
  planningTarget?: MealPlanningTarget | null;
  onSelectSlot: (slot: MealSlot) => void;
}

export function MealDayCard({
  day,
  readOnly,
  pendingRecipeId = null,
  planningDrafts = [],
  planningTarget = null,
  onSelectSlot,
}: MealDayCardProps) {
  return (
    <section className="space-y-3 rounded-lg border border-border bg-card/60 p-3">
      <h2 className="text-base font-semibold text-foreground">
        {formatDayLabel(day.date)}
      </h2>
      <div className="space-y-2">
        {day.slots.map((slot) => (
          <MealSlotCard
            key={slot.mealType}
            slot={slot}
            readOnly={readOnly}
            pendingRecipeId={pendingRecipeId}
            draft={
              planningDrafts.find(
                (draft) =>
                  draft.target.dayIndex === slot.dayIndex &&
                  draft.target.mealType === slot.mealType,
              ) ?? null
            }
            isPlanningTarget={
              planningTarget?.dayIndex === slot.dayIndex &&
              planningTarget.mealType === slot.mealType
            }
            onSelectSlot={onSelectSlot}
          />
        ))}
      </div>
    </section>
  );
}

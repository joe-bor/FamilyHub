import { formatLocalDate, parseLocalDate } from "@/lib/time-utils";
import type { MealDay, MealSlot } from "@/lib/types";
import { cn } from "@/lib/utils";
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
  const isToday = day.date === formatLocalDate(new Date());
  const headingId = `meal-day-${day.date}`;

  return (
    <section
      aria-labelledby={headingId}
      aria-current={isToday ? "date" : undefined}
      className={cn(
        "space-y-3 rounded-lg border p-3",
        isToday ? "border-primary/40 bg-primary/5" : "border-border bg-card/60",
      )}
    >
      <h2 id={headingId} className="text-base font-semibold text-foreground">
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

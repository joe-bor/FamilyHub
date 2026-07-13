import { formatLocalDate, parseLocalDate } from "@/lib/time-utils";
import type { MealBoard, MealSlot } from "@/lib/types";
import { cn } from "@/lib/utils";
import type {
  MealPlanningDraft,
  MealPlanningTarget,
} from "./meal-planning-session";
import { MealSlotCard } from "./meal-slot-card";
import { formatMealType } from "./meal-type-utils";

function shortWeekday(date: string) {
  return parseLocalDate(date).toLocaleDateString("en-US", {
    weekday: "short",
  });
}

function fullWeekday(date: string) {
  return parseLocalDate(date).toLocaleDateString("en-US", {
    weekday: "long",
  });
}

const MEAL_ROWS: Array<MealSlot["mealType"]> = ["breakfast", "lunch", "dinner"];

interface MealGridProps {
  board: MealBoard;
  readOnly: boolean;
  pendingRecipeId?: string | null;
  planningDrafts?: MealPlanningDraft[];
  planningTarget?: MealPlanningTarget | null;
  onSelectSlot: (slot: MealSlot) => void;
}

export function MealGrid({
  board,
  readOnly,
  pendingRecipeId = null,
  planningDrafts = [],
  planningTarget = null,
  onSelectSlot,
}: MealGridProps) {
  const todayIso = formatLocalDate(new Date());

  return (
    <div className="overflow-x-auto">
      <table
        aria-label="Weekly meals"
        className="w-full table-fixed overflow-hidden rounded-lg border border-border"
      >
        <thead>
          <tr>
            <th
              scope="col"
              className="w-[120px] border-b border-r border-border bg-muted/40 p-3"
            />
            {board.days.map((day) => {
              const isToday = day.date === todayIso;

              return (
                <th
                  key={day.date}
                  scope="col"
                  aria-label={fullWeekday(day.date)}
                  aria-current={isToday ? "date" : undefined}
                  className={cn(
                    "border-b border-r border-border p-2 text-center text-sm font-semibold text-foreground last:border-r-0",
                    isToday ? "bg-primary/10" : "bg-muted/40",
                  )}
                >
                  <span className="flex items-center justify-center gap-1.5">
                    <span
                      className={cn(
                        "text-xs font-semibold uppercase",
                        isToday ? "text-primary" : "text-muted-foreground",
                      )}
                    >
                      {shortWeekday(day.date)}
                    </span>
                    <span
                      className={cn(
                        "flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-sm",
                        isToday
                          ? "bg-primary text-primary-foreground"
                          : "text-foreground",
                      )}
                    >
                      {parseLocalDate(day.date).getDate()}
                    </span>
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {MEAL_ROWS.map((mealType) => (
            <tr key={mealType}>
              <th
                scope="row"
                className="border-b border-r border-border bg-muted/30 p-3 text-left text-sm font-semibold text-foreground last:border-b-0"
              >
                {formatMealType(mealType)}
              </th>
              {board.days.map((day) => {
                const slot = day.slots.find(
                  (candidate) => candidate.mealType === mealType,
                );
                if (!slot) return null;

                return (
                  <td
                    key={`${day.date}-${mealType}`}
                    className={cn(
                      "border-b border-r border-border p-2 align-top last:border-r-0",
                      day.date === todayIso ? "bg-primary/5" : null,
                    )}
                  >
                    <MealSlotCard
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
                      dayLabel={fullWeekday(day.date)}
                      onSelectSlot={onSelectSlot}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

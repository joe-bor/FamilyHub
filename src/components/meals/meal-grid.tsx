// biome-ignore-all lint/a11y/useSemanticElements: CSS grid needs explicit ARIA table roles so rows can flex vertically.
// biome-ignore-all lint/a11y/useFocusableInteractive: ARIA table structure is descriptive, not interactive.
import { formatLocalDate, parseLocalDate } from "@/lib/time-utils";
import type { MealBoard, MealSlot } from "@/lib/types";
import { cn } from "@/lib/utils";
import { MealGridCard } from "./meal-grid-card";
import type {
  MealPlanningDraft,
  MealPlanningTarget,
} from "./meal-planning-session";
import { formatMealType, mealTypeRailClasses } from "./meal-type-utils";

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

// One shared column template so header and body rows always align.
const GRID_COLS = "grid grid-cols-[2.25rem_repeat(7,minmax(0,1fr))]";

interface MealGridProps {
  board: MealBoard;
  readOnly: boolean;
  pendingRecipeId?: string | null;
  planningDrafts?: MealPlanningDraft[];
  planningTarget?: MealPlanningTarget | null;
  onSelectSlot: (slot: MealSlot) => void;
}

// ARIA table semantics are attached explicitly: real <table> rows cannot
// stretch to share viewport height, a flex column of CSS grids can.
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
    <div
      role="table"
      aria-label="Weekly meals"
      className="flex flex-1 flex-col overflow-hidden rounded-lg border border-border"
    >
      <div role="rowgroup">
        <div role="row" className={GRID_COLS}>
          <div
            role="columnheader"
            className="border-b border-r border-border bg-muted/40"
          />
          {board.days.map((day) => {
            const isToday = day.date === todayIso;

            return (
              <div
                key={day.date}
                role="columnheader"
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
              </div>
            );
          })}
        </div>
      </div>
      <div role="rowgroup" className="flex flex-1 flex-col">
        {MEAL_ROWS.map((mealType) => (
          <div
            key={mealType}
            role="row"
            className={cn(
              GRID_COLS,
              "min-h-[170px] flex-1 [&:last-child>*]:border-b-0",
            )}
          >
            <div
              role="rowheader"
              className="flex items-center justify-center border-b border-r border-border bg-muted/30"
            >
              <span
                className={cn(
                  "rotate-180 text-xs font-semibold uppercase tracking-widest [writing-mode:vertical-rl]",
                  mealTypeRailClasses(mealType),
                )}
              >
                {formatMealType(mealType)}
              </span>
            </div>
            {board.days.map((day) => {
              const slot = day.slots.find(
                (candidate) => candidate.mealType === mealType,
              );
              if (!slot) return null;

              return (
                <div
                  key={`${day.date}-${mealType}`}
                  role="cell"
                  className={cn(
                    "[contain:size] border-b border-r border-border p-2 last:border-r-0",
                    day.date === todayIso ? "bg-primary/5" : null,
                  )}
                >
                  <MealGridCard
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
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

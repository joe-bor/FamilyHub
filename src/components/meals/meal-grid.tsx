import { parseLocalDate } from "@/lib/time-utils";
import type { MealBoard, MealSlot } from "@/lib/types";
import { MealSlotCard } from "./meal-slot-card";
import { formatMealType } from "./meal-type-utils";

function dayName(date: string) {
  return parseLocalDate(date).toLocaleDateString("en-US", {
    weekday: "long",
  });
}

const MEAL_ROWS: Array<MealSlot["mealType"]> = ["breakfast", "lunch", "dinner"];

interface MealGridProps {
  board: MealBoard;
  readOnly: boolean;
  pendingRecipeId?: string | null;
  onSelectSlot: (slot: MealSlot) => void;
}

export function MealGrid({
  board,
  readOnly,
  pendingRecipeId = null,
  onSelectSlot,
}: MealGridProps) {
  return (
    <div className="hidden overflow-x-auto lg:block">
      <table
        aria-label="Weekly meals"
        className="min-w-[960px] table-fixed overflow-hidden rounded-lg border border-border"
      >
        <thead>
          <tr>
            <th
              scope="col"
              className="w-[120px] border-b border-r border-border bg-muted/40 p-3"
            />
            {board.days.map((day) => (
              <th
                key={day.date}
                scope="col"
                className="border-b border-r border-border bg-muted/40 p-3 text-center text-sm font-semibold text-foreground last:border-r-0"
              >
                {dayName(day.date)}
              </th>
            ))}
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
                    className="border-b border-r border-border p-2 align-top last:border-r-0"
                  >
                    <MealSlotCard
                      slot={slot}
                      readOnly={readOnly}
                      pendingRecipeId={pendingRecipeId}
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

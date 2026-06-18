import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useBackHandler } from "@/hooks";
import { parseLocalDate } from "@/lib/time-utils";
import type { MealBoard, MealType } from "@/lib/types";
import { formatMealType } from "./meal-type-utils";

const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner"];

function dayLabel(date: string) {
  return parseLocalDate(date).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

interface MealMoveTarget {
  dayIndex: number;
  mealType: MealType;
}

interface MealMovePickerProps {
  open: boolean;
  title: string;
  confirmLabel: string;
  board: MealBoard;
  source: MealMoveTarget;
  onConfirm: (target: MealMoveTarget) => void;
  onCancel: () => void;
}

export function MealMovePicker({
  open,
  title,
  confirmLabel,
  board,
  source,
  onConfirm,
  onCancel,
}: MealMovePickerProps) {
  const [dayIndex, setDayIndex] = useState((source.dayIndex + 1) % 7);
  const [mealType, setMealType] = useState<MealType>(source.mealType);
  useBackHandler(open, () => onCancel());

  useEffect(() => {
    if (!open) return;
    setDayIndex((source.dayIndex + 1) % 7);
    setMealType(source.mealType);
  }, [open, source.dayIndex, source.mealType]);

  const isSameSlot =
    dayIndex === source.dayIndex && mealType === source.mealType;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Pick the day and meal for this block.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <label className="block space-y-1">
            <span className="text-sm font-semibold text-foreground">Day</span>
            <select
              aria-label="Day"
              value={dayIndex}
              onChange={(event) => setDayIndex(Number(event.target.value))}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
            >
              {board.days.map((day) => (
                <option key={day.dayIndex} value={day.dayIndex}>
                  {dayLabel(day.date)}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-semibold text-foreground">Meal</span>
            <select
              aria-label="Meal"
              value={mealType}
              onChange={(event) => setMealType(event.target.value as MealType)}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
            >
              {MEAL_TYPES.map((type) => (
                <option key={type} value={type}>
                  {formatMealType(type)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <DialogFooter className="flex-col sm:flex-row">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={isSameSlot}
            onClick={() => onConfirm({ dayIndex, mealType })}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

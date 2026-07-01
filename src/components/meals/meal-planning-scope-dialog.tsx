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
import type { MealPlanningScope } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface MealPlanningScopeDialogProps {
  isOpen: boolean;
  weekLabel: string;
  days: Array<{ dayIndex: number; label: string }>;
  onStart: (scope: MealPlanningScope) => void;
  onOpenChange: (open: boolean) => void;
}

type ScopeKind = MealPlanningScope["kind"];

export function MealPlanningScopeDialog({
  isOpen,
  weekLabel,
  days,
  onStart,
  onOpenChange,
}: MealPlanningScopeDialogProps) {
  const [scopeKind, setScopeKind] = useState<ScopeKind>("empty_dinners");
  const [selectedDayIndexes, setSelectedDayIndexes] = useState<number[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    setScopeKind("empty_dinners");
    setSelectedDayIndexes([]);
  }, [isOpen]);

  const selectedDaysValid =
    scopeKind !== "selected_days" || selectedDayIndexes.length > 0;

  function toggleDay(dayIndex: number) {
    setSelectedDayIndexes((current) =>
      current.includes(dayIndex)
        ? current.filter((candidate) => candidate !== dayIndex)
        : [...current, dayIndex],
    );
  }

  function startPlanning() {
    if (!selectedDaysValid) return;

    if (scopeKind === "selected_days") {
      onStart({
        kind: "selected_days",
        dayIndexes: [...selectedDayIndexes].sort((a, b) => a - b),
      });
      return;
    }

    onStart({ kind: scopeKind });
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Fill empty slots</DialogTitle>
          <DialogDescription>{weekLabel}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2" role="radiogroup" aria-label="Meal scope">
            {[
              {
                value: "empty_dinners",
                label: "Empty dinners",
                description: "Plan only dinner slots that do not have meals.",
              },
              {
                value: "all_empty_slots",
                label: "All empty slots",
                description: "Plan breakfast, lunch, and dinner gaps.",
              },
              {
                value: "selected_days",
                label: "Selected days",
                description: "Choose the days to plan across all meal types.",
              },
            ].map((option) => (
              <label
                key={option.value}
                className={cn(
                  "flex gap-3 rounded-lg border border-border p-3 text-sm",
                  scopeKind === option.value ? "bg-primary/5" : "bg-card",
                )}
              >
                <input
                  type="radio"
                  name="meal-planning-scope"
                  value={option.value}
                  aria-label={option.label}
                  checked={scopeKind === option.value}
                  onChange={() => setScopeKind(option.value as ScopeKind)}
                  className="mt-1"
                />
                <span>
                  <span className="block font-semibold text-foreground">
                    {option.label}
                  </span>
                  <span className="text-muted-foreground">
                    {option.description}
                  </span>
                </span>
              </label>
            ))}
          </div>

          {scopeKind === "selected_days" ? (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">Days</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {days.map((day) => (
                  <label
                    key={day.dayIndex}
                    className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium"
                  >
                    <input
                      type="checkbox"
                      aria-label={day.label}
                      checked={selectedDayIndexes.includes(day.dayIndex)}
                      onChange={() => toggleDay(day.dayIndex)}
                    />
                    {day.label}
                  </label>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter className="flex-col sm:flex-row">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!selectedDaysValid}
            onClick={startPlanning}
          >
            Start planning
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

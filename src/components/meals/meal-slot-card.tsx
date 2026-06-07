import { Plus } from "lucide-react";
import { useState } from "react";
import type { MealSlot } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatMealType } from "./meal-type-utils";

interface MealSlotCardProps {
  slot: MealSlot;
  readOnly: boolean;
  pendingRecipeId?: string | null;
  onSelectSlot: (slot: MealSlot) => void;
}

export function MealSlotCard({
  slot,
  readOnly,
  pendingRecipeId = null,
  onSelectSlot,
}: MealSlotCardProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const label = formatMealType(slot.mealType);

  if (slot.primary) {
    return (
      <button
        type="button"
        className={cn(
          "w-full rounded-lg border border-border bg-card p-3 text-left shadow-sm transition-colors",
          readOnly ? "cursor-default" : "hover:bg-muted/50",
        )}
        aria-label={`Open ${slot.mealType}: ${slot.primary.title}`}
        onClick={() => onSelectSlot(slot)}
      >
        <div className="flex items-start gap-3">
          {slot.primary.imageUrl && !imgFailed ? (
            <img
              src={slot.primary.imageUrl}
              alt=""
              className="h-14 w-14 rounded-md object-cover"
              onError={() => setImgFailed(true)}
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-md bg-muted text-xs font-semibold text-muted-foreground">
              {label}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            <p className="truncate text-sm font-semibold text-foreground">
              {slot.primary.title}
            </p>
            {slot.primary.note ? (
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                {slot.primary.note}
              </p>
            ) : null}
            {slot.note ? (
              <p className="mt-1 line-clamp-2 text-xs italic text-muted-foreground">
                {slot.note}
              </p>
            ) : null}
          </div>
        </div>
        {slot.extras.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1">
            {slot.extras.slice(0, 2).map((extra) => (
              <span
                key={extra.id}
                className="rounded-full bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground"
              >
                {extra.title}
              </span>
            ))}
            {slot.extras.length > 2 ? (
              <span className="rounded-full bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">
                +{slot.extras.length - 2} more
              </span>
            ) : null}
          </div>
        ) : null}
      </button>
    );
  }

  if (readOnly) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3 text-sm text-muted-foreground">
        <span className="font-medium">{label}</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      className="flex min-h-20 w-full items-center justify-between rounded-lg border border-dashed border-border bg-background p-3 text-left transition-colors hover:border-primary/50 hover:bg-primary/5"
      aria-label={
        pendingRecipeId
          ? `Add recipe to ${slot.mealType}`
          : `Add ${slot.mealType} meal`
      }
      onClick={() => onSelectSlot(slot)}
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="mt-1 text-sm font-semibold text-foreground">Add meal</p>
      </div>
      <Plus className="h-4 w-4 text-primary" />
    </button>
  );
}

import { Plus } from "lucide-react";
import { useState } from "react";
import type { MealSlot } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { MealPlanningDraft } from "./meal-planning-session";
import { emptySlotLabel, filledSlotLabel } from "./meal-slot-labels";
import {
  formatMealType,
  mealTypeBandClasses,
  mealTypeIcon,
} from "./meal-type-utils";

interface MealGridCardProps {
  slot: MealSlot;
  readOnly: boolean;
  pendingRecipeId?: string | null;
  draft?: MealPlanningDraft | null;
  isPlanningTarget?: boolean;
  dayLabel: string;
  onSelectSlot: (slot: MealSlot) => void;
}

// Grid-only banner card. The mobile day-card layout keeps using MealSlotCard;
// the two share label logic via meal-slot-labels.
export function MealGridCard({
  slot,
  readOnly,
  pendingRecipeId = null,
  draft = null,
  isPlanningTarget = false,
  dayLabel,
  onSelectSlot,
}: MealGridCardProps) {
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const primary = draft
    ? {
        title: draft.displayTitle,
        imageUrl: draft.displayImageUrl,
        note: draft.displayNote,
      }
    : slot.primary;
  const hasExtras = !draft && slot.extras.length > 0;
  const imageUrl = primary?.imageUrl ?? null;
  const BandIcon = mealTypeIcon(slot.mealType);

  if (primary || hasExtras) {
    return (
      <button
        type="button"
        className={cn(
          "flex h-full w-full flex-col overflow-hidden rounded-lg border border-border bg-card text-left shadow-sm transition-colors",
          readOnly ? "cursor-default" : "hover:bg-muted/50",
          isPlanningTarget
            ? "border-primary/70 bg-primary/5 ring-2 ring-primary/20"
            : null,
        )}
        aria-current={isPlanningTarget ? "true" : undefined}
        aria-label={filledSlotLabel({
          mealType: slot.mealType,
          dayLabel,
          draftTitle: draft ? draft.displayTitle : null,
          primaryTitle: !draft && slot.primary ? slot.primary.title : null,
          firstExtraTitle: slot.extras[0]?.title ?? null,
        })}
        onClick={() => onSelectSlot(slot)}
      >
        <div className="relative min-h-14 w-full shrink-0 basis-[42%]">
          {imageUrl && imageUrl !== failedImageUrl ? (
            <img
              src={imageUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              onError={() => setFailedImageUrl(imageUrl)}
            />
          ) : (
            <div
              data-slot="meal-band"
              className={cn(
                "flex h-full w-full items-center justify-center",
                mealTypeBandClasses(slot.mealType),
              )}
            >
              <BandIcon aria-hidden className="h-6 w-6 opacity-80" />
            </div>
          )}
        </div>
        <div
          data-slot="meal-body"
          className="flex min-h-0 flex-1 flex-col gap-0.5 p-2"
        >
          {draft ? (
            <span className="inline-flex shrink-0 self-start rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              Draft
            </span>
          ) : null}
          <p className="line-clamp-2 shrink-0 text-sm font-semibold leading-tight text-foreground">
            {primary?.title ?? "Extras"}
          </p>
          {primary?.note || slot.note ? (
            <div data-slot="meal-notes" className="min-h-0 overflow-hidden">
              {primary?.note ? (
                <p className="line-clamp-2 text-xs text-muted-foreground">
                  {primary.note}
                </p>
              ) : null}
              {slot.note ? (
                <p className="line-clamp-2 text-xs italic text-muted-foreground">
                  {slot.note}
                </p>
              ) : null}
            </div>
          ) : null}
          {hasExtras ? (
            <div
              data-slot="meal-extras"
              className="mt-auto flex shrink-0 flex-nowrap items-center gap-1 overflow-hidden pt-1"
            >
              {slot.extras.slice(0, 2).map((extra) => (
                <span
                  key={extra.id}
                  className="min-w-0 flex-1 truncate rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
                >
                  {extra.title}
                </span>
              ))}
              {slot.extras.length > 2 ? (
                <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                  +{slot.extras.length - 2} more
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </button>
    );
  }

  if (readOnly) {
    return (
      <div
        className={cn(
          "flex h-full w-full items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 p-3 text-sm text-muted-foreground",
          isPlanningTarget ? "border-primary/70 ring-2 ring-primary/20" : null,
        )}
        aria-current={isPlanningTarget ? "true" : undefined}
      >
        <span className="font-medium">{formatMealType(slot.mealType)}</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      className={cn(
        "flex h-full min-h-20 w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-background p-3 transition-colors hover:border-primary/50 hover:bg-primary/5",
        isPlanningTarget
          ? "border-primary/70 bg-primary/5 ring-2 ring-primary/20"
          : null,
      )}
      aria-current={isPlanningTarget ? "true" : undefined}
      aria-label={emptySlotLabel({
        mealType: slot.mealType,
        dayLabel,
        hasPendingRecipe: Boolean(pendingRecipeId),
      })}
      onClick={() => onSelectSlot(slot)}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
        <Plus aria-hidden className="h-4 w-4 text-primary" />
      </span>
      <span className="text-sm font-medium text-muted-foreground">
        Add {slot.mealType}
      </span>
    </button>
  );
}

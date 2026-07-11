import { usePressable } from "@/hooks";
import type { ListSummary } from "@/lib/types";
import { cn } from "@/lib/utils";
import { kindMeta } from "./list-kind-meta";

interface ListCardProps {
  list: ListSummary;
  onOpen: () => void;
}

export function ListCard({ list, onOpen }: ListCardProps) {
  const pressable = usePressable();
  const meta = kindMeta[list.kind];
  const Icon = meta.icon;
  const remainingItems = list.totalItems - list.completedItems;
  const progressLabel =
    list.totalItems === 0
      ? "No items yet"
      : `${list.completedItems} of ${list.totalItems} done`;
  const remainingLabel =
    list.totalItems === 0
      ? "Ready to fill"
      : `${remainingItems} ${remainingItems === 1 ? "item" : "items"} left`;

  return (
    <button
      type="button"
      onClick={onOpen}
      onPointerDown={pressable.onPointerDown}
      className={cn(
        "min-h-32 rounded-lg border border-border bg-card p-4 text-left shadow-sm transition-all hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        pressable.className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
            meta.className,
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <span className="rounded-full bg-muted px-2 py-1 text-[11px] font-semibold leading-none text-muted-foreground">
          {meta.label}
        </span>
      </div>
      <h3 className="mt-4 line-clamp-2 text-[17px] font-semibold leading-6 text-foreground">
        {list.name}
      </h3>
      <div className="mt-2 space-y-1">
        <p className="text-sm leading-5 text-muted-foreground">
          {progressLabel}
        </p>
        <p className="text-xs font-semibold leading-4 text-muted-foreground">
          {remainingLabel}
        </p>
      </div>
    </button>
  );
}

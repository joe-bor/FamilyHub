import { usePressable } from "@/hooks";
import type { ListSummary } from "@/lib/types";
import { cn } from "@/lib/utils";
import { kindMeta } from "./list-kind-meta";

interface ListRailRowProps {
  list: ListSummary;
  selected: boolean;
  onSelect: () => void;
}

export function ListRailRow({ list, selected, onSelect }: ListRailRowProps) {
  const pressable = usePressable();
  const meta = kindMeta[list.kind];
  const Icon = meta.icon;
  const remaining = list.totalItems - list.completedItems;
  const remainingLabel =
    list.totalItems === 0
      ? "Ready to fill"
      : `${remaining} ${remaining === 1 ? "item" : "items"} left`;
  const ariaLabel =
    list.totalItems === 0
      ? `${list.name}${selected ? ", selected" : ""}, no items yet`
      : `${list.name}${selected ? ", selected" : ""}, ${remaining} ${remaining === 1 ? "item" : "items"} remaining`;

  return (
    <button
      type="button"
      onClick={onSelect}
      onPointerDown={pressable.onPointerDown}
      aria-current={selected ? "true" : undefined}
      aria-label={ariaLabel}
      className={cn(
        "flex min-h-[44px] w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected
          ? "border-primary bg-primary/10"
          : "border-transparent hover:bg-muted",
        pressable.className,
      )}
    >
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
          meta.className,
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold leading-5 text-foreground">
          {list.name}
        </span>
        <span className="block text-xs leading-4 text-muted-foreground">
          {remainingLabel}
        </span>
      </span>
    </button>
  );
}

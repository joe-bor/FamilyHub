import { Check, Pencil, Trash2 } from "lucide-react";
import { haptics } from "@/lib/haptics";
import type { ListItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";

interface ListItemRowProps {
  item: ListItem;
  onToggle: (completed: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function ListItemRow({
  item,
  onToggle,
  onEdit,
  onDelete,
}: ListItemRowProps) {
  return (
    <div className="flex min-h-14 items-center gap-2 rounded-lg border border-border bg-card p-2 shadow-sm">
      {/*
        Keep this a raw <button>, not <Button>/usePressable: a pressable would
        fire haptics.tap() on pointerdown, and the shared 40ms throttle would
        then coalesce away the haptics.success() pulse on click. The single
        completion pulse depends on no preceding tap on the same gesture.
        Guarded by the throttle-coupling test in haptics.test.ts.
      */}
      <button
        type="button"
        aria-pressed={item.completed}
        onClick={() => {
          if (!item.completed) haptics.success(); // completing transition only
          onToggle(!item.completed);
        }}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span
          className={cn(
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
            item.completed
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background",
          )}
        >
          {item.completed && <Check className="h-4 w-4" />}
        </span>
        <span
          className={cn(
            "min-w-0 flex-1 break-words text-[15px] font-medium leading-5",
            item.completed
              ? "text-muted-foreground line-through"
              : "text-foreground",
          )}
        >
          {item.text}
        </span>
      </button>
      <Button type="button" variant="ghost" size="icon-sm" onClick={onEdit}>
        <Pencil className="h-4 w-4" />
        <span className="sr-only">Edit</span>
      </Button>
      <Button type="button" variant="ghost" size="icon-sm" onClick={onDelete}>
        <Trash2 className="h-4 w-4" />
        <span className="sr-only">Delete</span>
      </Button>
    </div>
  );
}

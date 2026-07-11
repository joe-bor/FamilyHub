import { Plus } from "lucide-react";
import type { ListSummary } from "@/lib/types";
import { Button } from "../ui/button";
import { ListRailRow } from "./list-rail-row";

interface ListsRailProps {
  summaries: ListSummary[];
  selectedListId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
}

export function ListsRail({
  summaries,
  selectedListId,
  onSelect,
  onCreate,
}: ListsRailProps) {
  return (
    <nav
      aria-label="Lists"
      className="flex w-[340px] shrink-0 flex-col border-r border-border"
    >
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <h2 className="text-[17px] font-semibold leading-6 text-foreground">
          My Lists
        </h2>
        <Button type="button" onClick={onCreate} className="min-h-[44px]">
          <Plus className="h-4 w-4" />
          New List
        </Button>
      </div>
      <ul className="flex-1 space-y-1 overflow-y-auto p-2">
        {summaries.map((summary) => (
          <li key={summary.id}>
            <ListRailRow
              list={summary}
              selected={selectedListId === summary.id}
              onSelect={() => onSelect(summary.id)}
            />
          </li>
        ))}
      </ul>
    </nav>
  );
}

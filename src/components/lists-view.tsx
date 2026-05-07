import { ArrowLeft, Plus } from "lucide-react";
import { useState } from "react";
import { useList, useListPreferences, useLists } from "@/api";
import type { ListKind } from "@/lib/types";
import { ListCard } from "./lists/list-card";
import { ListCreateSheet } from "./lists/list-create-sheet";
import { Button } from "./ui/button";

const kindLabels: Record<ListKind, string> = {
  grocery: "Grocery",
  "to-do": "To-do",
  general: "General",
};

function ListDetailShell({
  listId,
  onBack,
}: {
  listId: string;
  onBack: () => void;
}) {
  const list = useList(listId);

  if (list.isLoading) {
    return (
      <div className="flex-1 p-4 text-sm text-muted-foreground">
        Loading list
      </div>
    );
  }

  if (!list.data?.data) {
    return (
      <div className="flex-1 p-4">
        <Button type="button" variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          Back to Lists
        </Button>
        <p className="mt-6 text-sm text-muted-foreground">
          This list could not be loaded.
        </p>
      </div>
    );
  }

  const detail = list.data.data;

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6">
      <div className="mx-auto max-w-2xl space-y-4">
        <Button type="button" variant="ghost" onClick={onBack} className="px-0">
          <ArrowLeft className="h-4 w-4" />
          Back to Lists
        </Button>
        <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-muted-foreground">
            {kindLabels[detail.kind]}
          </p>
          <h2 className="mt-1 text-[22px] font-semibold leading-7 text-foreground">
            {detail.name}
          </h2>
        </div>
      </div>
    </div>
  );
}

export function ListsView() {
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const lists = useLists();
  useListPreferences();

  if (selectedListId !== null) {
    return (
      <ListDetailShell
        listId={selectedListId}
        onBack={() => setSelectedListId(null)}
      />
    );
  }

  if (lists.isLoading) {
    return (
      <div className="flex-1 p-4 text-sm text-muted-foreground">
        Loading lists
      </div>
    );
  }

  const summaries = lists.data?.data ?? [];

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[24px] font-semibold leading-8 text-foreground">
            My Lists
          </h2>
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            New List
          </Button>
        </div>

        {summaries.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card p-6 text-center shadow-sm">
            <h3 className="text-lg font-semibold text-foreground">
              No lists yet
            </h3>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-5 text-muted-foreground">
              Create the first shared family list for groceries, errands, or
              anything else worth keeping together.
            </p>
            <Button
              type="button"
              className="mt-4"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Create first list
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            {summaries.map((list) => (
              <ListCard
                key={list.id}
                list={list}
                onOpen={() => setSelectedListId(list.id)}
              />
            ))}
          </div>
        )}

        <ListCreateSheet
          open={createOpen}
          onOpenChange={setCreateOpen}
          onCreated={(id) => setSelectedListId(id)}
        />
      </div>
    </div>
  );
}

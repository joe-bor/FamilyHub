import { type ReactNode, useEffect, useState } from "react";
import { useListPreferences, useLists } from "@/api";
import { OfflineUnavailable } from "@/components/shared";
import { useAppStore } from "@/stores";
import { ListCreateSheet } from "./list-create-sheet";
import { ListDetailView } from "./list-detail-view";
import { ListsEmptyState } from "./lists-empty-state";
import { ListsErrorState } from "./lists-error-state";
import { ListsRail } from "./lists-rail";

function fullArea(content: ReactNode) {
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto max-w-2xl">{content}</div>
    </div>
  );
}

export function ListsLargeScreen() {
  const lists = useLists();
  const preferences = useListPreferences();
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const consumeListDetailIntent = useAppStore(
    (state) => state.consumeListDetailIntent,
  );
  const summaries = lists.data?.data ?? [];

  useEffect(() => {
    // Keep cross-module detail intents pending until the summaries arrive, then
    // consume once and select the requested list only when it still exists.
    if (!lists.data?.data || lists.isFetching || lists.isError) return;

    const id = consumeListDetailIntent();
    if (id && lists.data.data.some((summary) => summary.id === id)) {
      setSelectedListId(id);
    }
  }, [lists.data, lists.isFetching, lists.isError, consumeListDetailIntent]);

  // Selection is derived instead of reconciled through an effect. During a
  // refetch, retain a just-created id until the refreshed summaries include it.
  const effectiveSelectedId =
    selectedListId &&
    (summaries.some((summary) => summary.id === selectedListId) ||
      lists.isFetching)
      ? selectedListId
      : (summaries[0]?.id ?? null);
  const preferencesStatus = preferences.isLoading
    ? "loading"
    : preferences.isError
      ? "error"
      : preferences.data?.data
        ? "ready"
        : "unavailable";

  if (lists.isLoading) {
    return (
      <div className="flex-1 p-6 text-sm text-muted-foreground">
        Loading lists
      </div>
    );
  }

  if (lists.isError) {
    return fullArea(<ListsErrorState onRetry={() => lists.refetch()} />);
  }

  if (!lists.data) {
    return <OfflineUnavailable label="lists" />;
  }

  if (summaries.length === 0) {
    return (
      <>
        {fullArea(<ListsEmptyState onCreate={() => setCreateOpen(true)} />)}
        <ListCreateSheet
          open={createOpen}
          onOpenChange={setCreateOpen}
          onCreated={setSelectedListId}
        />
      </>
    );
  }

  return (
    <>
      <div className="flex min-h-0 flex-1">
        <ListsRail
          summaries={summaries}
          selectedListId={effectiveSelectedId}
          onSelect={setSelectedListId}
          onCreate={() => setCreateOpen(true)}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          {effectiveSelectedId && (
            <ListDetailView
              key={effectiveSelectedId}
              listId={effectiveSelectedId}
              preferences={preferences.data?.data ?? null}
              preferencesStatus={preferencesStatus}
              onBack={() => {}}
              showBackButton={false}
            />
          )}
        </div>
      </div>
      <ListCreateSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={setSelectedListId}
      />
    </>
  );
}

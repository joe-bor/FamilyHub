import { Plus } from "lucide-react";
import { useState } from "react";
import { useListPreferences, useLists } from "@/api";
import { OfflineUnavailable, ScreenTransition } from "@/components/shared";
import { useIsMobile } from "@/hooks";
import { cn } from "@/lib/utils";
import { ListCard } from "./lists/list-card";
import { ListCreateSheet } from "./lists/list-create-sheet";
import { ListDetailView } from "./lists/list-detail-view";
import { Button } from "./ui/button";

export function ListsView() {
  const isMobile = useIsMobile();
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const lists = useLists();
  const preferences = useListPreferences();

  const body = (() => {
    if (selectedListId !== null) {
      return (
        <ListDetailView
          listId={selectedListId}
          preferences={preferences.data?.data ?? null}
          preferencesStatus={
            preferences.isLoading
              ? "loading"
              : preferences.isError
                ? "error"
                : preferences.data?.data
                  ? "ready"
                  : "unavailable"
          }
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

    if (lists.isError) {
      return (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mx-auto max-w-2xl space-y-6">
            <div
              className={cn(
                "flex items-center gap-3",
                isMobile ? "justify-end" : "justify-between",
              )}
            >
              {!isMobile && (
                <h2 className="text-[24px] font-semibold leading-8 text-foreground">
                  My Lists
                </h2>
              )}
              <Button type="button" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" />
                New List
              </Button>
            </div>

            <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-foreground">
                Lists could not be loaded
              </h3>
              <p className="mt-2 text-sm leading-5 text-muted-foreground">
                Check your connection and try again.
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-4"
                onClick={() => lists.refetch()}
              >
                Try again
              </Button>
            </div>

            <ListCreateSheet
              open={createOpen}
              onOpenChange={setCreateOpen}
              onCreated={(id) => setSelectedListId(id)}
            />
          </div>
        </div>
      );
    }

    // Offline + never loaded: the paused query has no data and no error, so
    // distinguish "offline, nothing cached" from a genuinely empty list.
    if (!lists.data) {
      return <OfflineUnavailable label="lists" />;
    }

    const summaries = lists.data.data;

    return (
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="mx-auto max-w-2xl space-y-6">
          <div
            className={cn(
              "flex items-center gap-3",
              isMobile ? "justify-end" : "justify-between",
            )}
          >
            {!isMobile && (
              <h2 className="text-[24px] font-semibold leading-8 text-foreground">
                My Lists
              </h2>
            )}
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
  })();

  return (
    <ScreenTransition
      token={selectedListId ?? "__list__"}
      mode="slide"
      direction={selectedListId ? "forward" : "back"}
    >
      {body}
    </ScreenTransition>
  );
}

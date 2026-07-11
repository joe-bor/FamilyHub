import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useListPreferences, useLists } from "@/api";
import {
  FloatingActionButton,
  MOBILE_FAB_SCROLL_PADDING,
  OfflineUnavailable,
  ScreenTransition,
} from "@/components/shared";
import { useBackHandler, useIsMobile } from "@/hooks";
import { useAppStore } from "@/stores";
import { Button } from "../ui/button";
import { ListCard } from "./list-card";
import { ListCreateSheet } from "./list-create-sheet";
import { ListDetailView } from "./list-detail-view";

export function ListsMobileView() {
  const isMobile = useIsMobile();
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const consumeListDetailIntent = useAppStore((s) => s.consumeListDetailIntent);
  useEffect(() => {
    const id = consumeListDetailIntent();
    if (id) setSelectedListId(id);
  }, [consumeListDetailIntent]);
  const lists = useLists();
  const preferences = useListPreferences();
  useBackHandler(selectedListId !== null, () => setSelectedListId(null));

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
        <div
          className="flex-1 overflow-y-auto p-4 sm:p-6"
          style={{
            paddingBottom: isMobile ? MOBILE_FAB_SCROLL_PADDING : undefined,
          }}
        >
          <div className="mx-auto max-w-2xl space-y-6">
            {!isMobile && (
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-[24px] font-semibold leading-8 text-foreground">
                  My Lists
                </h2>
                <Button type="button" onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4" />
                  New List
                </Button>
              </div>
            )}

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
      <div
        className="flex-1 overflow-y-auto p-4 sm:p-6"
        style={{
          paddingBottom: isMobile ? MOBILE_FAB_SCROLL_PADDING : undefined,
        }}
      >
        <div className="mx-auto max-w-2xl space-y-6">
          {!isMobile && (
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[24px] font-semibold leading-8 text-foreground">
                My Lists
              </h2>
              <Button type="button" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" />
                New List
              </Button>
            </div>
          )}

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
        </div>
      </div>
    );
  })();

  return (
    <>
      <ScreenTransition
        token={selectedListId ?? "__list__"}
        mode="slide"
        direction={selectedListId ? "forward" : "back"}
      >
        {body}
      </ScreenTransition>
      {isMobile && selectedListId === null && (
        <FloatingActionButton
          label="Create list"
          onClick={() => setCreateOpen(true)}
        />
      )}
      <ListCreateSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(id) => setSelectedListId(id)}
      />
    </>
  );
}

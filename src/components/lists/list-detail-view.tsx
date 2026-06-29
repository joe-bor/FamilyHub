import { ArrowLeft, Plus, SlidersHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  ApiException,
  useClearCompleted,
  useDeleteListItem,
  useList,
  useUpdateList,
  useUpdateListItem,
  useUpdateListPreferences,
} from "@/api";
import {
  FloatingActionButton,
  MOBILE_FAB_SCROLL_PADDING,
} from "@/components/shared";
import { useIsMobile, useOnlineStatus } from "@/hooks";
import type { ListItem, ListPreferences, UpdateListRequest } from "@/lib/types";
import { Button } from "../ui/button";
import { MobileSheet } from "../ui/mobile-sheet";
import { toast } from "../ui/toaster";
import { buildListSections } from "./build-list-sections";
import { CategoryManager } from "./category-manager";
import { ListItemRow } from "./list-item-row";
import { ListItemSheet } from "./list-item-sheet";
import { ListOptionsControls } from "./list-options-controls";

const kindLabels = {
  grocery: "Grocery",
  "to-do": "To-do",
  general: "General",
} as const;

const MOBILE_MANAGER_HANDOFF_FALLBACK_MS = 650;

interface ListDetailViewProps {
  listId: string;
  preferences: ListPreferences | null;
  preferencesStatus: "ready" | "loading" | "error" | "unavailable";
  onBack: () => void;
}

export function ListDetailView({
  listId,
  preferences,
  preferencesStatus,
  onBack,
}: ListDetailViewProps) {
  const listQuery = useList(listId);
  const updateList = useUpdateList(listId);
  const updateItem = useUpdateListItem(listId);
  const deleteItem = useDeleteListItem(listId);
  const clearCompleted = useClearCompleted(listId);
  const updatePreferences = useUpdateListPreferences();
  const isMobile = useIsMobile();
  const isOnline = useOnlineStatus();
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [managerOpen, setManagerOpen] = useState(false);
  // Task 11: ref for the mobile "List options" SlidersHorizontal trigger button,
  // so we can return focus to it after the manager closes on mobile.
  const optionsButtonRef = useRef<HTMLButtonElement | null>(null);
  // Task 11: ref for the desktop "Manage categories" button,
  // so we can return focus to it after the manager closes on desktop.
  const desktopManageButtonRef = useRef<HTMLButtonElement | null>(null);
  // Task 11: true while we're mid-handoff (Options closing → manager about to open).
  // During this window we suppress Options' focus restoration so focus doesn't
  // bounce back to the trigger before the manager is ready.
  const [managerHandoffPending, setManagerHandoffPending] = useState(false);

  const [itemSheet, setItemSheet] = useState<{
    mode: "create" | "edit";
    item: ListItem | null;
  } | null>(null);

  useEffect(() => {
    if (!managerHandoffPending || optionsOpen) return;

    const timeoutId = window.setTimeout(() => {
      setManagerHandoffPending(false);
      setManagerOpen(true);
    }, MOBILE_MANAGER_HANDOFF_FALLBACK_MS);

    return () => window.clearTimeout(timeoutId);
  }, [managerHandoffPending, optionsOpen]);

  if (listQuery.isLoading) {
    return (
      <div className="flex-1 p-4 text-sm text-muted-foreground">
        Loading list
      </div>
    );
  }

  if (!listQuery.data?.data) {
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

  const list = listQuery.data.data;
  const hasPreferences = preferences !== null;
  const familyShowCompletedDefault =
    preferences?.showCompletedByDefault ?? true;
  const completedControlsDisabled = !hasPreferences;
  const resolvedShowCompleted =
    list.showCompletedOverride ?? familyShowCompletedDefault;
  const sections = buildListSections({
    list,
    showCompleted: resolvedShowCompleted,
  });
  const visibleItemCount = sections.reduce(
    (count, section) => count + section.items.length,
    0,
  );
  const completedOverrideValue =
    list.showCompletedOverride === null
      ? "family-default"
      : list.showCompletedOverride
        ? "show"
        : "hide";
  const completedFallbackMessage =
    preferencesStatus === "loading"
      ? "Family completed default is loading. Completed items are shown until it loads."
      : "Family completed default is unavailable. Completed items are shown until it loads.";
  const clearCompletedDisabled =
    !list.items.some((item) => item.completed) ||
    updateItem.isPending ||
    clearCompleted.isPending;

  function handleUpdateList(request: UpdateListRequest) {
    updateList.mutate(request, {
      onError: (error) => {
        const description = ApiException.isApiException(error)
          ? error.message
          : "Could not update list options. Please try again.";
        toast({
          title: "List options not saved",
          description,
          variant: "destructive",
        });
      },
    });
  }

  return (
    <>
      <div
        className="flex-1 overflow-y-auto p-4 sm:p-6"
        style={{
          paddingBottom: isMobile ? MOBILE_FAB_SCROLL_PADDING : undefined,
        }}
      >
        <div className="mx-auto max-w-2xl space-y-4">
          <Button
            type="button"
            variant="ghost"
            onClick={onBack}
            className="px-0"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Lists
          </Button>

          <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  {kindLabels[list.kind]}
                </p>
                <h2 className="mt-1 break-words text-[22px] font-semibold leading-7 text-foreground">
                  {list.name}
                </h2>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {!isMobile && (
                  <Button
                    type="button"
                    onClick={() => setItemSheet({ mode: "create", item: null })}
                  >
                    <Plus className="h-4 w-4" />
                    Add item
                  </Button>
                )}
                {isMobile && (
                  <Button
                    ref={optionsButtonRef}
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="List options"
                    className="h-11 w-11"
                    onClick={() => {
                      // Re-opening Options cancels any in-flight handoff so the
                      // manager doesn't pop open on a later, unrequested close.
                      setManagerHandoffPending(false);
                      setOptionsOpen(true);
                    }}
                  >
                    <SlidersHorizontal className="h-5 w-5" />
                  </Button>
                )}
              </div>
            </div>

            {!isMobile && (
              <div className="mt-4">
                <ListOptionsControls
                  list={list}
                  hasPreferences={hasPreferences}
                  familyShowCompletedDefault={familyShowCompletedDefault}
                  completedControlsDisabled={completedControlsDisabled}
                  completedOverrideValue={completedOverrideValue}
                  completedFallbackMessage={completedFallbackMessage}
                  clearCompletedDisabled={clearCompletedDisabled}
                  onManageCategories={() => setManagerOpen(true)}
                  categoriesOnline={isOnline}
                  manageCategoriesButtonRef={desktopManageButtonRef}
                  onUpdateList={handleUpdateList}
                  onUpdatePreferences={(request) =>
                    updatePreferences.mutate(request)
                  }
                  onClearCompleted={() => clearCompleted.mutate()}
                />
              </div>
            )}
          </div>

          {list.items.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-card p-6 text-center shadow-sm">
              <h3 className="text-lg font-semibold text-foreground">
                No items yet
              </h3>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-5 text-muted-foreground">
                Add the first item to get this list moving.
              </p>
            </div>
          ) : visibleItemCount === 0 ? (
            <div className="rounded-lg border border-border bg-card p-6 text-center shadow-sm">
              <h3 className="text-lg font-semibold text-foreground">
                No active items
              </h3>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-5 text-muted-foreground">
                Completed items are hidden for this list.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {sections.map((section) => (
                <section key={section.id} className="space-y-2">
                  {section.title && (
                    <h3 className="px-1 text-sm font-semibold uppercase text-muted-foreground">
                      {section.title}
                    </h3>
                  )}
                  <div className="space-y-2">
                    {section.items.map((item) => (
                      <ListItemRow
                        key={item.id}
                        item={item}
                        onToggle={(completed) =>
                          updateItem.mutate({
                            itemId: item.id,
                            request: {
                              text: item.text,
                              completed,
                              categoryId: item.categoryId,
                            },
                          })
                        }
                        onEdit={() => setItemSheet({ mode: "edit", item })}
                        onDelete={() => deleteItem.mutate(item.id)}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}

          {isMobile && (
            <MobileSheet
              isOpen={optionsOpen}
              onClose={() => setOptionsOpen(false)}
              title="List options"
              initialHeight="half"
              // Task 11: suppress focus restoration during handoff so focus doesn't
              // bounce back to the trigger before the manager opens
              restoreFocusOnClose={!managerHandoffPending}
              // Task 11: when the close animation completes during a handoff,
              // open the manager and clear the pending flag
              onAnimationEnd={(open) => {
                if (!open && managerHandoffPending) {
                  setManagerHandoffPending(false);
                  setManagerOpen(true);
                }
              }}
            >
              <div className="space-y-5">
                <ListOptionsControls
                  list={list}
                  hasPreferences={hasPreferences}
                  familyShowCompletedDefault={familyShowCompletedDefault}
                  completedControlsDisabled={completedControlsDisabled}
                  completedOverrideValue={completedOverrideValue}
                  completedFallbackMessage={completedFallbackMessage}
                  clearCompletedDisabled={clearCompletedDisabled}
                  fullWidthClearButton
                  // Task 11: mobile handoff — set pending flag then close Options;
                  // the manager opens only after the close animation completes
                  onManageCategories={() => {
                    setManagerHandoffPending(true);
                    setOptionsOpen(false);
                  }}
                  categoriesOnline={isOnline}
                  onUpdateList={handleUpdateList}
                  onUpdatePreferences={(request) =>
                    updatePreferences.mutate(request)
                  }
                  onClearCompleted={() => clearCompleted.mutate()}
                />
              </div>
            </MobileSheet>
          )}

          <ListItemSheet
            open={itemSheet !== null}
            mode={itemSheet?.mode ?? "create"}
            list={list}
            item={itemSheet?.item ?? null}
            onOpenChange={(open) => {
              if (!open) setItemSheet(null);
            }}
          />

          {/* Category manager — Task 11: focusTitleOnOpen + returnFocusRef for handoff */}
          <CategoryManager
            open={managerOpen}
            onOpenChange={setManagerOpen}
            kind={list.kind}
            returnFocusRef={
              isMobile ? optionsButtonRef : desktopManageButtonRef
            }
          />
        </div>
      </div>
      {isMobile && (
        <FloatingActionButton
          label="Add item"
          onClick={() => setItemSheet({ mode: "create", item: null })}
        />
      )}
    </>
  );
}

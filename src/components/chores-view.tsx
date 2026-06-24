import { AlertCircle, Plus } from "lucide-react";
import { useState } from "react";
import {
  type ApiException,
  isStaleChorePeriodError,
  useChoresBoard,
  useCompleteChoreForCurrentPeriod,
  useCreateChoreTemplate,
  useUncompleteChoreForCurrentPeriod,
  useUpdateChoreTemplate,
} from "@/api";
import { ChoreFormSheet } from "@/components/chores/chore-form-sheet";
import { ChoreScopeColumn } from "@/components/chores/chores-scope-column";
import {
  type ChoreScopeKey,
  ChoreScopeSwitcher,
} from "@/components/chores/chores-scope-switcher";
import {
  FloatingActionButton,
  MOBILE_FAB_SCROLL_PADDING,
  OfflineUnavailable,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { useIsMobile } from "@/hooks";
import type { ChoreBoardItem, ChoreScopeBoard, ChoresBoard } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { ChoreFormData } from "@/lib/validations";

function hasAnyRoutines(board: ChoresBoard): boolean {
  return [board.today, board.thisWeek, board.thisMonth].some(
    (scope) => scope.summary.total > 0,
  );
}

function selectedScope(board: ChoresBoard, scope: ChoreScopeKey) {
  if (scope === "today") return board.today;
  if (scope === "thisWeek") return board.thisWeek;
  return board.thisMonth;
}

function showStalePeriodRecovery(error: ApiException) {
  if (!isStaleChorePeriodError(error)) return;

  toast({
    title: "Chores were out of date",
    description: "Refreshing the board. Try that again.",
    variant: "destructive",
  });
}

export function ChoresView() {
  const isMobile = useIsMobile();
  const [selectedScopeKey, setSelectedScopeKey] =
    useState<ChoreScopeKey>("today");
  const [isCreateOpen, setCreateOpen] = useState(false);
  const { data, isError, isLoading } = useChoresBoard();
  const createTemplate = useCreateChoreTemplate({
    onSuccess: () => setCreateOpen(false),
  });
  const updateTemplate = useUpdateChoreTemplate();
  const completeCurrentPeriod = useCompleteChoreForCurrentPeriod({
    onError: showStalePeriodRecovery,
  });
  const uncompleteCurrentPeriod = useUncompleteChoreForCurrentPeriod({
    onError: showStalePeriodRecovery,
  });
  const board = data?.data;
  const hasRoutines = board ? hasAnyRoutines(board) : false;
  const visibleScopes = board
    ? isMobile
      ? [selectedScope(board, selectedScopeKey)]
      : [board.today, board.thisWeek, board.thisMonth]
    : [];
  const activeFrom = board?.today.periodStartDate;
  const canCreate = Boolean(activeFrom) && !isLoading && !isError;

  const handleCreate = (values: ChoreFormData) => {
    if (!activeFrom) return;

    createTemplate.mutate({
      title: values.title,
      assignedToMemberId: values.assignedToMemberId,
      cadence: values.cadence,
      activeFrom,
    });
  };

  const handleArchive = (_scope: ChoreScopeBoard, chore: ChoreBoardItem) => {
    updateTemplate.mutate({
      id: chore.templateId,
      request: { archived: true },
    });
  };

  const handleComplete = (scope: ChoreScopeBoard, chore: ChoreBoardItem) => {
    completeCurrentPeriod.mutate({
      templateId: chore.templateId,
      request: {
        scope: scope.scope,
        periodStartDate: scope.periodStartDate,
      },
    });
  };

  const handleUncomplete = (scope: ChoreScopeBoard, chore: ChoreBoardItem) => {
    uncompleteCurrentPeriod.mutate({
      templateId: chore.templateId,
      request: {
        scope: scope.scope,
        periodStartDate: scope.periodStartDate,
      },
    });
  };

  return (
    <>
      <div
        className="flex-1 overflow-y-auto p-4 sm:p-6"
        style={{
          paddingBottom: isMobile ? MOBILE_FAB_SCROLL_PADDING : undefined,
        }}
      >
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 flex items-start justify-between gap-3">
            <div className="space-y-3">
              {!isMobile && (
                <h1 className="text-[24px] leading-8 font-semibold text-foreground">
                  Chores
                </h1>
              )}
              {isMobile && (
                <ChoreScopeSwitcher
                  value={selectedScopeKey}
                  onChange={setSelectedScopeKey}
                />
              )}
            </div>
            {!isMobile && (
              <Button
                type="button"
                aria-label="Add recurring chore"
                size="icon"
                disabled={!canCreate}
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="h-5 w-5" />
              </Button>
            )}
          </div>

          {isLoading && (
            <div className="py-16 text-center text-sm text-muted-foreground">
              Loading chores...
            </div>
          )}

          {isError && (
            <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              <AlertCircle className="h-5 w-5 shrink-0" />
              Could not load chores. Try again in a moment.
            </div>
          )}

          {/* Offline + never loaded: paused query leaves no data and no error. */}
          {!isLoading && !isError && !board && (
            <OfflineUnavailable label="chores" />
          )}

          {!isLoading && !isError && board && !hasRoutines && (
            <div className="rounded-lg border border-dashed border-border px-6 py-14 text-center">
              <h2 className="text-lg font-semibold text-foreground">
                No recurring chores yet
              </h2>
              <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
                Add a daily, weekly, or monthly routine to get started.
              </p>
            </div>
          )}

          {!isLoading && !isError && board && hasRoutines && (
            <div className={cn("grid gap-4", !isMobile && "lg:grid-cols-3")}>
              {visibleScopes.map((scope) => (
                <ChoreScopeColumn
                  key={scope.scope}
                  scope={scope}
                  showHeading={!isMobile}
                  onArchive={handleArchive}
                  onComplete={handleComplete}
                  onUncomplete={handleUncomplete}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <ChoreFormSheet
        isOpen={isCreateOpen}
        onClose={() => setCreateOpen(false)}
        isPending={createTemplate.isPending}
        onSubmit={handleCreate}
      />

      {isMobile && (
        <FloatingActionButton
          label="Add recurring chore"
          disabled={!canCreate}
          onClick={() => setCreateOpen(true)}
        />
      )}
    </>
  );
}

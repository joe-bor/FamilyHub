import type { UseQueryOptions } from "@tanstack/react-query";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApiException } from "@/api/client";
import { choreService } from "@/api/services";
import type {
  ApiResponse,
  ChoreAssigneeGroup as ChoreAssigneeGroupData,
  ChoreBoardItem,
  ChoreCurrentPeriodState,
  ChoreScope,
  ChoreScopeBoard,
  ChoresBoard,
  ChoreTemplate,
  CreateChoreTemplateRequest,
  UpdateChoreTemplateRequest,
  UpdateCurrentPeriodCompletionRequest,
} from "@/lib/types";

export const choreKeys = {
  all: ["chores"] as const,
  board: () => [...choreKeys.all, "board"] as const,
};

type BoardScopeKey = "today" | "thisWeek" | "thisMonth";

const STALE_CHORE_PERIOD_MESSAGE =
  "Chore period is stale. Refresh and try again.";

export function isStaleChorePeriodError(error: ApiException): boolean {
  return error.status === 400 && error.message === STALE_CHORE_PERIOD_MESSAGE;
}

function boardKeyForScope(scope: ChoreScope): BoardScopeKey {
  if (scope === "TODAY") return "today";
  if (scope === "THIS_WEEK") return "thisWeek";
  return "thisMonth";
}

function recalculateAssigneeGroup(
  group: ChoreAssigneeGroupData,
): ChoreAssigneeGroupData {
  const total = group.chores.length;
  const completed = group.chores.filter((chore) => chore.completed).length;
  const incompleteChores = group.chores.filter((chore) => !chore.completed);
  const completedChores = group.chores.filter((chore) => chore.completed);

  return {
    ...group,
    chores: [...incompleteChores, ...completedChores],
    summary: {
      total,
      completed,
      remaining: total - completed,
    },
  };
}

function recalculateScope(scope: ChoreScopeBoard): ChoreScopeBoard {
  const assignees = scope.assignees
    .map(recalculateAssigneeGroup)
    .filter((group) => group.summary.total > 0);
  const total = assignees.reduce((sum, group) => sum + group.summary.total, 0);
  const completed = assignees.reduce(
    (sum, group) => sum + group.summary.completed,
    0,
  );

  return {
    ...scope,
    assignees,
    summary: {
      total,
      completed,
      remaining: total - completed,
    },
  };
}

function replaceChoreInScope(
  scope: ChoreScopeBoard,
  updatedChore: ChoreBoardItem,
): ChoreScopeBoard {
  return recalculateScope({
    ...scope,
    assignees: scope.assignees.map((group) => ({
      ...group,
      chores: group.chores.map((chore) =>
        chore.templateId === updatedChore.templateId ? updatedChore : chore,
      ),
    })),
  });
}

function removeTemplateFromScope(
  scope: ChoreScopeBoard,
  templateId: string,
): ChoreScopeBoard {
  return recalculateScope({
    ...scope,
    assignees: scope.assignees.map((group) => ({
      ...group,
      chores: group.chores.filter((chore) => chore.templateId !== templateId),
    })),
  });
}

function applyCurrentPeriodState(
  board: ChoresBoard,
  state: ChoreCurrentPeriodState,
): ChoresBoard {
  const scopeKey = boardKeyForScope(state.scope);

  return {
    ...board,
    [scopeKey]: replaceChoreInScope(board[scopeKey], state.item),
  };
}

function findChoreInScope(
  scope: ChoreScopeBoard,
  templateId: string,
): ChoreBoardItem | undefined {
  for (const group of scope.assignees) {
    const match = group.chores.find((chore) => chore.templateId === templateId);
    if (match) return match;
  }
  return undefined;
}

// Synthesize the completion state locally so the board updates the moment a
// routine is tapped, before the server's canonical response arrives. Reuses the
// same scope recalculation as the success path so counts and ordering stay
// consistent. The request scope tells us which board column owns the routine.
function applyOptimisticCompletion(
  board: ChoresBoard,
  scope: ChoreScope,
  templateId: string,
  completed: boolean,
): ChoresBoard {
  const scopeKey = boardKeyForScope(scope);
  const existing = findChoreInScope(board[scopeKey], templateId);
  if (!existing) return board;

  const optimisticItem: ChoreBoardItem = {
    ...existing,
    completed,
    // completedAt is an instant, not a calendar date, so toISOString() is
    // correct here; the server overwrites it with the canonical value on success.
    completedAt: completed
      ? (existing.completedAt ?? new Date().toISOString())
      : null,
  };

  return {
    ...board,
    [scopeKey]: replaceChoreInScope(board[scopeKey], optimisticItem),
  };
}

function removeTemplateFromBoard(
  board: ChoresBoard,
  templateId: string,
): ChoresBoard {
  return {
    ...board,
    today: removeTemplateFromScope(board.today, templateId),
    thisWeek: removeTemplateFromScope(board.thisWeek, templateId),
    thisMonth: removeTemplateFromScope(board.thisMonth, templateId),
  };
}

export function useChoresBoard(
  options?: Omit<
    UseQueryOptions<ApiResponse<ChoresBoard>, ApiException>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: choreKeys.board(),
    queryFn: () => choreService.getBoard(),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

interface CreateChoreTemplateCallbacks {
  onSuccess?: (data: ApiResponse<ChoreTemplate>) => void;
  onError?: (error: ApiException) => void;
}

export function useCreateChoreTemplate(
  callbacks?: CreateChoreTemplateCallbacks,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateChoreTemplateRequest) =>
      choreService.createTemplate(request),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: choreKeys.board() });
      callbacks?.onSuccess?.(response);
    },
    onError: (error: ApiException) => {
      callbacks?.onError?.(error);
    },
  });
}

interface UpdateChoreTemplateCallbacks {
  onSuccess?: (data: ApiResponse<ChoreTemplate>) => void;
  onError?: (error: ApiException) => void;
}

export function useUpdateChoreTemplate(
  callbacks?: UpdateChoreTemplateCallbacks,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      request,
    }: {
      id: string;
      request: UpdateChoreTemplateRequest;
    }) => choreService.updateTemplate(id, request),
    onSuccess: (response) => {
      if (response.data.archived) {
        queryClient.setQueryData<ApiResponse<ChoresBoard>>(
          choreKeys.board(),
          (current) =>
            current
              ? {
                  ...current,
                  data: removeTemplateFromBoard(current.data, response.data.id),
                }
              : current,
        );
        queryClient.invalidateQueries({
          queryKey: choreKeys.board(),
          refetchType: "none",
        });
      } else {
        queryClient.invalidateQueries({ queryKey: choreKeys.board() });
      }
      callbacks?.onSuccess?.(response);
    },
    onError: (error: ApiException) => {
      callbacks?.onError?.(error);
    },
  });
}

interface CurrentPeriodCompletionCallbacks {
  onSuccess?: (data: ApiResponse<ChoreCurrentPeriodState>) => void;
  onError?: (error: ApiException) => void;
}

export function useCompleteChoreForCurrentPeriod(
  callbacks?: CurrentPeriodCompletionCallbacks,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      templateId,
      request,
    }: {
      templateId: string;
      request: UpdateCurrentPeriodCompletionRequest;
    }) => choreService.completeCurrentPeriod(templateId, request),
    onMutate: async ({ templateId, request }) => {
      await queryClient.cancelQueries({ queryKey: choreKeys.board() });
      const previous = queryClient.getQueryData<ApiResponse<ChoresBoard>>(
        choreKeys.board(),
      );
      queryClient.setQueryData<ApiResponse<ChoresBoard>>(
        choreKeys.board(),
        (current) =>
          current
            ? {
                ...current,
                data: applyOptimisticCompletion(
                  current.data,
                  request.scope,
                  templateId,
                  true,
                ),
              }
            : current,
      );
      return { previous };
    },
    onSuccess: (response) => {
      queryClient.setQueryData<ApiResponse<ChoresBoard>>(
        choreKeys.board(),
        (current) =>
          current
            ? {
                ...current,
                data: applyCurrentPeriodState(current.data, response.data),
              }
            : current,
      );
      queryClient.invalidateQueries({
        queryKey: choreKeys.board(),
        refetchType: "none",
      });
      callbacks?.onSuccess?.(response);
    },
    onError: (error: ApiException, _variables, context) => {
      // Roll the whole board back to the pre-tap snapshot, then let the
      // stale-period path force a refetch for the canonical server state.
      if (context?.previous) {
        queryClient.setQueryData(choreKeys.board(), context.previous);
      }
      if (isStaleChorePeriodError(error)) {
        queryClient.invalidateQueries({
          queryKey: choreKeys.board(),
          refetchType: "all",
        });
      }
      callbacks?.onError?.(error);
    },
  });
}

export function useUncompleteChoreForCurrentPeriod(
  callbacks?: CurrentPeriodCompletionCallbacks,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      templateId,
      request,
    }: {
      templateId: string;
      request: UpdateCurrentPeriodCompletionRequest;
    }) => choreService.uncompleteCurrentPeriod(templateId, request),
    onMutate: async ({ templateId, request }) => {
      await queryClient.cancelQueries({ queryKey: choreKeys.board() });
      const previous = queryClient.getQueryData<ApiResponse<ChoresBoard>>(
        choreKeys.board(),
      );
      queryClient.setQueryData<ApiResponse<ChoresBoard>>(
        choreKeys.board(),
        (current) =>
          current
            ? {
                ...current,
                data: applyOptimisticCompletion(
                  current.data,
                  request.scope,
                  templateId,
                  false,
                ),
              }
            : current,
      );
      return { previous };
    },
    onSuccess: (response) => {
      queryClient.setQueryData<ApiResponse<ChoresBoard>>(
        choreKeys.board(),
        (current) =>
          current
            ? {
                ...current,
                data: applyCurrentPeriodState(current.data, response.data),
              }
            : current,
      );
      queryClient.invalidateQueries({
        queryKey: choreKeys.board(),
        refetchType: "none",
      });
      callbacks?.onSuccess?.(response);
    },
    onError: (error: ApiException, _variables, context) => {
      // Roll the whole board back to the pre-tap snapshot, then let the
      // stale-period path force a refetch for the canonical server state.
      if (context?.previous) {
        queryClient.setQueryData(choreKeys.board(), context.previous);
      }
      if (isStaleChorePeriodError(error)) {
        queryClient.invalidateQueries({
          queryKey: choreKeys.board(),
          refetchType: "all",
        });
      }
      callbacks?.onError?.(error);
    },
  });
}

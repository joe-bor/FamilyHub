import type { UseQueryOptions } from "@tanstack/react-query";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApiException } from "@/api/client";
import { choreService } from "@/api/services";
import type {
  ApiResponse,
  ChoreCurrentPeriodState,
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
      queryClient.invalidateQueries({ queryKey: choreKeys.board() });
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
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: choreKeys.board() });
      callbacks?.onSuccess?.(response);
    },
    onError: (error: ApiException) => {
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
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: choreKeys.board() });
      callbacks?.onSuccess?.(response);
    },
    onError: (error: ApiException) => {
      callbacks?.onError?.(error);
    },
  });
}

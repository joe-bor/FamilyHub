import type { UseQueryOptions } from "@tanstack/react-query";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApiException } from "@/api/client";
import { choreService } from "@/api/services";
import type { ApiResponse, Chore, UpdateChoreRequest } from "@/lib/types";

export const choreKeys = {
  all: ["chores"] as const,
  list: () => [...choreKeys.all, "list"] as const,
};

export function useChores(
  options?: Omit<
    UseQueryOptions<ApiResponse<Chore[]>, ApiException>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: choreKeys.list(),
    queryFn: choreService.getChores,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

interface CreateChoreCallbacks {
  onSuccess?: (data: ApiResponse<Chore>) => void;
  onError?: (error: ApiException) => void;
}

export function useCreateChore(callbacks?: CreateChoreCallbacks) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: choreService.createChore,
    onSuccess: (response) => {
      queryClient.setQueryData<ApiResponse<Chore[]>>(choreKeys.list(), (old) =>
        old
          ? { ...old, data: [...old.data, response.data] }
          : { data: [response.data] },
      );
      callbacks?.onSuccess?.(response);
    },
    onError: (error: ApiException) => {
      callbacks?.onError?.(error);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: choreKeys.list() });
    },
  });
}

interface UpdateChoreCallbacks {
  onSuccess?: (data: ApiResponse<Chore>) => void;
  onError?: (error: ApiException) => void;
}

export function useUpdateChore(callbacks?: UpdateChoreCallbacks) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      request,
    }: {
      id: string;
      request: UpdateChoreRequest;
    }) => choreService.updateChore(id, request),
    onMutate: async ({ id, request }) => {
      await queryClient.cancelQueries({ queryKey: choreKeys.list() });

      const previousData = queryClient.getQueryData<ApiResponse<Chore[]>>(
        choreKeys.list(),
      );

      queryClient.setQueryData<ApiResponse<Chore[]>>(choreKeys.list(), (old) =>
        old
          ? {
              ...old,
              data: old.data.map((chore) =>
                chore.id === id
                  ? {
                      ...chore,
                      completed: request.completed,
                      completedAt: request.completed ? chore.completedAt : null,
                    }
                  : chore,
              ),
            }
          : old,
      );

      return { previousData };
    },
    onError: (error: ApiException, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(choreKeys.list(), context.previousData);
      }
      callbacks?.onError?.(error);
    },
    onSuccess: (response) => {
      queryClient.setQueryData<ApiResponse<Chore[]>>(choreKeys.list(), (old) =>
        old
          ? {
              ...old,
              data: old.data.map((chore) =>
                chore.id === response.data.id ? response.data : chore,
              ),
            }
          : old,
      );
      callbacks?.onSuccess?.(response);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: choreKeys.list() });
    },
  });
}

interface DeleteChoreCallbacks {
  onSuccess?: () => void;
  onError?: (error: ApiException) => void;
}

export function useDeleteChore(callbacks?: DeleteChoreCallbacks) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: choreService.deleteChore,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: choreKeys.list() });

      const previousData = queryClient.getQueryData<ApiResponse<Chore[]>>(
        choreKeys.list(),
      );

      queryClient.setQueryData<ApiResponse<Chore[]>>(choreKeys.list(), (old) =>
        old
          ? {
              ...old,
              data: old.data.filter((chore) => chore.id !== id),
            }
          : old,
      );

      return { previousData };
    },
    onError: (error: ApiException, _id, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(choreKeys.list(), context.previousData);
      }
      callbacks?.onError?.(error);
    },
    onSuccess: () => {
      callbacks?.onSuccess?.();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: choreKeys.list() });
    },
  });
}

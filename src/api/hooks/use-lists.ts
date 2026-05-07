import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listsService } from "@/api/services";
import type {
  CreateListItemRequest,
  CreateListRequest,
  ListDetailApiResponse,
  ListItem,
  ListPreferencesApiResponse,
  UpdateListItemRequest,
  UpdateListPreferencesRequest,
  UpdateListRequest,
} from "@/lib/types";

export const listsKeys = {
  all: ["lists"] as const,
  hub: () => [...listsKeys.all, "hub"] as const,
  detail: (id: string) => [...listsKeys.all, "detail", id] as const,
  preferences: () => [...listsKeys.all, "preferences"] as const,
};

function updateDetailItems(
  previous: ListDetailApiResponse | undefined,
  update: (items: ListItem[]) => ListItem[],
): ListDetailApiResponse | undefined {
  if (!previous) return previous;
  return {
    ...previous,
    data: {
      ...previous.data,
      items: update(previous.data.items),
    },
  };
}

export function useLists() {
  return useQuery({
    queryKey: listsKeys.hub(),
    queryFn: listsService.getLists,
  });
}

export function useList(id: string | null) {
  return useQuery({
    queryKey: listsKeys.detail(id ?? "none"),
    queryFn: () => listsService.getList(id!),
    enabled: id !== null,
  });
}

export function useListPreferences() {
  return useQuery({
    queryKey: listsKeys.preferences(),
    queryFn: listsService.getPreferences,
  });
}

export function useCreateList(callbacks?: {
  onSuccess?: (data: ListDetailApiResponse) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateListRequest) =>
      listsService.createList(request),
    onSuccess: (response) => {
      queryClient.setQueryData(listsKeys.detail(response.data.id), response);
      queryClient.invalidateQueries({ queryKey: listsKeys.hub() });
      callbacks?.onSuccess?.(response);
    },
  });
}

export function useUpdateList(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: UpdateListRequest) =>
      listsService.updateList(id, request),
    onSuccess: (response) => {
      queryClient.setQueryData(listsKeys.detail(id), response);
      queryClient.invalidateQueries({ queryKey: listsKeys.hub() });
    },
  });
}

export function useCreateListItem(listId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateListItemRequest) =>
      listsService.createItem(listId, request),
    onSuccess: (response) => {
      queryClient.setQueryData<ListDetailApiResponse>(
        listsKeys.detail(listId),
        (previous) =>
          updateDetailItems(previous, (items) => [...items, response.data]),
      );
      queryClient.invalidateQueries({ queryKey: listsKeys.hub() });
    },
  });
}

export function useUpdateListItem(listId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      itemId,
      request,
    }: {
      itemId: string;
      request: UpdateListItemRequest;
    }) => listsService.updateItem(listId, itemId, request),
    onSuccess: (response) => {
      queryClient.setQueryData<ListDetailApiResponse>(
        listsKeys.detail(listId),
        (previous) =>
          updateDetailItems(previous, (items) =>
            items.map((item) =>
              item.id === response.data.id ? response.data : item,
            ),
          ),
      );
      queryClient.invalidateQueries({ queryKey: listsKeys.hub() });
    },
  });
}

export function useDeleteListItem(listId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: string) => listsService.deleteItem(listId, itemId),
    onSuccess: (_data, itemId) => {
      queryClient.setQueryData<ListDetailApiResponse>(
        listsKeys.detail(listId),
        (previous) =>
          updateDetailItems(previous, (items) =>
            items.filter((item) => item.id !== itemId),
          ),
      );
      queryClient.invalidateQueries({ queryKey: listsKeys.hub() });
    },
  });
}

export function useClearCompleted(listId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => listsService.clearCompleted(listId),
    onSuccess: () => {
      queryClient.setQueryData<ListDetailApiResponse>(
        listsKeys.detail(listId),
        (previous) =>
          updateDetailItems(previous, (items) =>
            items.filter((item) => !item.completed),
          ),
      );
      queryClient.invalidateQueries({ queryKey: listsKeys.hub() });
    },
  });
}

export function useUpdateListPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: UpdateListPreferencesRequest) =>
      listsService.updatePreferences(request),
    onMutate: async (request) => {
      await queryClient.cancelQueries({ queryKey: listsKeys.preferences() });
      const previous = queryClient.getQueryData<ListPreferencesApiResponse>(
        listsKeys.preferences(),
      );

      queryClient.setQueryData<ListPreferencesApiResponse>(
        listsKeys.preferences(),
        { data: request },
      );

      return { previous };
    },
    onError: (_error, _request, context) => {
      if (context?.previous) {
        queryClient.setQueryData(listsKeys.preferences(), context.previous);
      }
    },
    onSuccess: (response) => {
      queryClient.setQueryData(listsKeys.preferences(), response);
    },
  });
}

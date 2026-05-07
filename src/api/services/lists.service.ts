import { httpClient } from "@/api/client";
import type {
  ClearCompletedApiResponse,
  CreateListItemRequest,
  CreateListRequest,
  ListDetailApiResponse,
  ListItemApiResponse,
  ListPreferencesApiResponse,
  ListSummariesApiResponse,
  UpdateListItemRequest,
  UpdateListPreferencesRequest,
  UpdateListRequest,
} from "@/lib/types";

export const listsService = {
  getLists(): Promise<ListSummariesApiResponse> {
    return httpClient.get<ListSummariesApiResponse>("/lists");
  },

  getList(id: string): Promise<ListDetailApiResponse> {
    return httpClient.get<ListDetailApiResponse>(`/lists/${id}`);
  },

  createList(request: CreateListRequest): Promise<ListDetailApiResponse> {
    return httpClient.post<ListDetailApiResponse>("/lists", request);
  },

  updateList(
    id: string,
    request: UpdateListRequest,
  ): Promise<ListDetailApiResponse> {
    return httpClient.patch<ListDetailApiResponse>(`/lists/${id}`, request);
  },

  createItem(
    listId: string,
    request: CreateListItemRequest,
  ): Promise<ListItemApiResponse> {
    return httpClient.post<ListItemApiResponse>(
      `/lists/${listId}/items`,
      request,
    );
  },

  updateItem(
    listId: string,
    itemId: string,
    request: UpdateListItemRequest,
  ): Promise<ListItemApiResponse> {
    return httpClient.patch<ListItemApiResponse>(
      `/lists/${listId}/items/${itemId}`,
      request,
    );
  },

  deleteItem(listId: string, itemId: string): Promise<void> {
    return httpClient.delete(`/lists/${listId}/items/${itemId}`);
  },

  clearCompleted(listId: string): Promise<ClearCompletedApiResponse> {
    return httpClient.post<ClearCompletedApiResponse>(
      `/lists/${listId}/clear-completed`,
    );
  },

  getPreferences(): Promise<ListPreferencesApiResponse> {
    return httpClient.get<ListPreferencesApiResponse>("/lists/preferences");
  },

  updatePreferences(
    request: UpdateListPreferencesRequest,
  ): Promise<ListPreferencesApiResponse> {
    return httpClient.patch<ListPreferencesApiResponse>(
      "/lists/preferences",
      request,
    );
  },
};

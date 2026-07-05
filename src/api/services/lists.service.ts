import { httpClient } from "@/api/client";
import type {
  BulkCreateListItemsRequest,
  CategoryDeleteResultApiResponse,
  ClearCompletedApiResponse,
  CreateListCategoryRequest,
  CreateListItemRequest,
  CreateListRequest,
  ListCategoryCatalogApiResponse,
  ListCategoryManagementEntryApiResponse,
  ListDetailApiResponse,
  ListItemApiResponse,
  ListItemsApiResponse,
  ListKind,
  ListPreferencesApiResponse,
  ListSummariesApiResponse,
  RenameListCategoryRequest,
  ReorderListCategoriesRequest,
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

  createItemsBulk(
    listId: string,
    request: BulkCreateListItemsRequest,
  ): Promise<ListItemsApiResponse> {
    return httpClient.post<ListItemsApiResponse>(
      `/lists/${listId}/items/bulk`,
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

  // ---------------------------------------------------------------------------
  // Category management (v1.7.0)
  // ---------------------------------------------------------------------------

  getCategories(kind: ListKind): Promise<ListCategoryCatalogApiResponse> {
    return httpClient.get<ListCategoryCatalogApiResponse>(
      `/lists/categories?kind=${kind}`,
    );
  },

  createCategory(
    request: CreateListCategoryRequest,
  ): Promise<ListCategoryManagementEntryApiResponse> {
    return httpClient.post<ListCategoryManagementEntryApiResponse>(
      "/lists/categories",
      request,
    );
  },

  renameCategory(
    categoryId: string,
    request: RenameListCategoryRequest,
  ): Promise<ListCategoryManagementEntryApiResponse> {
    return httpClient.patch<ListCategoryManagementEntryApiResponse>(
      `/lists/categories/${categoryId}`,
      request,
    );
  },

  deleteCategory(categoryId: string): Promise<CategoryDeleteResultApiResponse> {
    return httpClient.delete<CategoryDeleteResultApiResponse>(
      `/lists/categories/${categoryId}`,
    );
  },

  reorderCategories(
    request: ReorderListCategoriesRequest,
  ): Promise<ListCategoryCatalogApiResponse> {
    return httpClient.put<ListCategoryCatalogApiResponse>(
      "/lists/categories/order",
      request,
    );
  },
};

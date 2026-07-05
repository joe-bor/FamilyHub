import type { ApiResponse } from "./api-response";

export type ListKind = "grocery" | "to-do" | "general";
export type ListCategoryDisplayMode = "grouped" | "flat";

export interface ListCategoryOption {
  id: string;
  kind: ListKind;
  name: string;
  sortOrder: number;
}

export interface ListCategoryManagementEntry extends ListCategoryOption {
  itemCount: number;
}

export interface ListCategoryCatalog {
  kind: ListKind;
  groupedListCount: number;
  categories: ListCategoryManagementEntry[];
}

export interface CategoryDeleteResult {
  uncategorizedItemCount: number;
  flattenedListCount: number;
}

export interface CreateListCategoryRequest {
  kind: ListKind;
  name: string;
}

export interface RenameListCategoryRequest {
  name: string;
}

export interface ReorderListCategoriesRequest {
  kind: ListKind;
  expectedCategoryIds: string[];
  categoryIds: string[];
}

export interface ListSummary {
  id: string;
  name: string;
  kind: ListKind;
  totalItems: number;
  completedItems: number;
}

export interface ListItem {
  id: string;
  text: string;
  completed: boolean;
  completedAt: string | null;
  categoryId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListDetail {
  id: string;
  name: string;
  kind: ListKind;
  categoryDisplayMode: ListCategoryDisplayMode;
  showCompletedOverride: boolean | null;
  categories: ListCategoryOption[];
  items: ListItem[];
  createdAt: string;
  updatedAt: string;
}

export interface ListPreferences {
  showCompletedByDefault: boolean;
}

export interface CreateListRequest {
  name: string;
  kind: ListKind;
}

export interface UpdateListRequest {
  categoryDisplayMode: ListCategoryDisplayMode;
  showCompletedOverride: boolean | null;
}

export interface CreateListItemRequest {
  text: string;
  categoryId?: string | null;
}

export interface BulkCreateListItemsRequest {
  items: CreateListItemRequest[];
}

export interface UpdateListItemRequest {
  text: string;
  completed: boolean;
  categoryId?: string | null;
}

export interface UpdateListPreferencesRequest {
  showCompletedByDefault: boolean;
}

export interface ClearCompletedResponse {
  removedCount: number;
}

export type ListSummariesApiResponse = ApiResponse<ListSummary[]>;
export type ListDetailApiResponse = ApiResponse<ListDetail>;
export type ListItemApiResponse = ApiResponse<ListItem>;
export type ListItemsApiResponse = ApiResponse<ListItem[]>;
export type ListPreferencesApiResponse = ApiResponse<ListPreferences>;
export type ClearCompletedApiResponse = ApiResponse<ClearCompletedResponse>;
export type ListCategoryCatalogApiResponse = ApiResponse<ListCategoryCatalog>;
export type ListCategoryManagementEntryApiResponse =
  ApiResponse<ListCategoryManagementEntry>;
export type CategoryDeleteResultApiResponse = ApiResponse<CategoryDeleteResult>;

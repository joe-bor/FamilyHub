import type { ApiResponse } from "./api-response";

export interface RecipeSummary {
  id: string;
  title: string;
  imageUrl: string | null;
  favorite: boolean;
  tags: string[];
  updatedAt: string;
}

export interface RecipeDetail extends RecipeSummary {
  ingredients: string[];
  instructions: string[];
  note: string | null;
  sourceUrl: string | null;
}

export interface CreateRecipeRequest {
  title: string;
  imageUrl?: string | null;
  ingredients?: string[];
  instructions?: string[];
  note?: string | null;
  sourceUrl?: string | null;
  tags?: string[];
  favorite?: boolean;
}

export interface UpdateRecipeRequest {
  title?: string;
  imageUrl?: string | null;
  ingredients?: string[];
  instructions?: string[];
  note?: string | null;
  sourceUrl?: string | null;
  tags?: string[];
  favorite?: boolean;
}

export interface ImportRecipeRequest {
  url: string;
}

export type RecipesApiResponse = ApiResponse<RecipeSummary[]>;
export type RecipeDetailApiResponse = ApiResponse<RecipeDetail>;

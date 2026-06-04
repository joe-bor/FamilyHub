import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import type { ApiResponse, RecipeDetail } from "@/lib/types";
import {
  importedRecipeDetail,
  testRecipeDetail,
  testRecipeSummary,
} from "@/test/fixtures/recipes";
import { resetMockRecipes, seedMockRecipes, server } from "@/test/mocks/server";
import {
  recipesKeys,
  useCreateRecipe,
  useImportRecipe,
  useRecipe,
  useRecipes,
  useUpdateRecipe,
} from "./use-recipes";

describe("useRecipes", () => {
  let queryClient: QueryClient;

  function createWrapper() {
    return function Wrapper({ children }: { children: ReactNode }) {
      return (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );
    };
  }

  beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
  afterEach(() => {
    server.resetHandlers();
    resetMockRecipes();
    queryClient.clear();
  });
  afterAll(() => server.close());

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: Infinity, staleTime: Infinity },
        mutations: { retry: false },
      },
    });
  });

  it("loads recipe summaries from MSW", async () => {
    seedMockRecipes([testRecipeDetail]);

    const { result } = renderHook(() => useRecipes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data?.data).toEqual([testRecipeSummary]);
    });
  });

  it("loads recipe detail data", async () => {
    seedMockRecipes([testRecipeDetail]);

    const { result } = renderHook(() => useRecipe(testRecipeDetail.id), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data?.data).toEqual(testRecipeDetail);
    });
  });

  it("seeds detail cache and invalidates the library query after create", async () => {
    seedMockRecipes([]);
    await queryClient.setQueryData(recipesKeys.list(), { data: [] });

    const { result } = renderHook(() => useCreateRecipe(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      title: "  Tomato Pasta  ",
      ingredients: ["pasta", "tomatoes"],
      instructions: ["boil", "toss"],
      tags: ["dinner", "quick"],
    });

    await waitFor(() => {
      expect(result.current.data?.data.title).toBe("Tomato Pasta");
    });

    const created = result.current.data?.data;
    expect(created?.ingredients).toEqual(["pasta", "tomatoes"]);
    expect(
      queryClient.getQueryData<ApiResponse<RecipeDetail>>(
        recipesKeys.detail(created!.id),
      )?.data,
    ).toEqual(created);
    expect(queryClient.getQueryState(recipesKeys.list())?.isInvalidated).toBe(
      true,
    );
  });

  it("updates detail cache and invalidates the library query after update", async () => {
    seedMockRecipes([testRecipeDetail]);
    queryClient.setQueryData(recipesKeys.list(), { data: [testRecipeSummary] });
    queryClient.setQueryData(recipesKeys.detail(testRecipeDetail.id), {
      data: testRecipeDetail,
    } satisfies ApiResponse<RecipeDetail>);

    const { result } = renderHook(() => useUpdateRecipe(testRecipeDetail.id), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      title: "Sheet Pan Salmon and Veg",
      favorite: false,
      ingredients: ["Salmon", "Broccoli"],
    });

    await waitFor(() => {
      expect(result.current.data?.data.title).toBe("Sheet Pan Salmon and Veg");
    });

    expect(
      queryClient.getQueryData<ApiResponse<RecipeDetail>>(
        recipesKeys.detail(testRecipeDetail.id),
      )?.data,
    ).toMatchObject({
      title: "Sheet Pan Salmon and Veg",
      favorite: false,
      ingredients: ["Salmon", "Broccoli"],
    });
    expect(queryClient.getQueryState(recipesKeys.list())?.isInvalidated).toBe(
      true,
    );
  });

  it("imports a recipe, seeds detail cache, invalidates the library, and surfaces import errors", async () => {
    seedMockRecipes([]);
    queryClient.setQueryData(recipesKeys.list(), { data: [] });

    const { result } = renderHook(() => useImportRecipe(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ url: importedRecipeDetail.sourceUrl! });

    await waitFor(() => {
      expect(result.current.data?.data).toEqual(importedRecipeDetail);
    });

    expect(
      queryClient.getQueryData<ApiResponse<RecipeDetail>>(
        recipesKeys.detail(importedRecipeDetail.id),
      )?.data,
    ).toEqual(importedRecipeDetail);
    expect(queryClient.getQueryState(recipesKeys.list())?.isInvalidated).toBe(
      true,
    );

    result.current.mutate({ url: "https://example.com/import-error" });

    await waitFor(() => {
      expect(result.current.error?.message).toBe("Could not import recipe");
    });
  });

  it("matches backend import URL guardrails in MSW", async () => {
    const { result } = renderHook(() => useImportRecipe(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ url: "ftp://example.com/recipe" });

    await waitFor(() => {
      expect(result.current.error?.message).toBe("Could not import recipe");
    });

    result.current.reset();
    result.current.mutate({ url: "http://127.0.0.1/private" });

    await waitFor(() => {
      expect(result.current.error?.message).toBe("Could not import recipe");
    });
  });

  it("resets recipe-generated ids independently from list mocks", async () => {
    resetMockRecipes();

    const { result } = renderHook(() => useCreateRecipe(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ title: "First Recipe" });

    await waitFor(() => {
      expect(result.current.data?.data.id).toBe(
        "00000000-0000-4000-8000-000000001001",
      );
    });

    resetMockRecipes();
    result.current.reset();
    result.current.mutate({ title: "Second Recipe" });

    await waitFor(() => {
      expect(result.current.data?.data.id).toBe(
        "00000000-0000-4000-8000-000000001001",
      );
    });
  });
});

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { createElement, type ReactNode } from "react";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import { testRecipeDetail } from "@/test/fixtures/recipes";
import {
  API_BASE,
  resetMockRecipes,
  seedMockRecipes,
} from "@/test/mocks/handlers";
import { server } from "@/test/mocks/server";
import { useRecipeDetails } from "./use-recipe-details";

let queryClient: QueryClient;

function createWrapper() {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(
      QueryClientProvider,
      { client: queryClient },
      children,
    );
  };
}

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterAll(() => server.close());

beforeEach(() => {
  queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: Infinity },
    },
  });
  resetMockRecipes();
});

afterEach(() => {
  queryClient.clear();
  server.resetHandlers();
});

describe("useRecipeDetails", () => {
  it("maps loaded, missing (404), and error (500) recipes by id", async () => {
    // r1 → loaded, r2 → 404 missing, r3 → 500 error
    const loaded = { ...testRecipeDetail, id: "r1" };
    seedMockRecipes([loaded]);
    server.use(
      http.get(`${API_BASE}/recipes/r3`, () =>
        HttpResponse.json({ message: "boom" }, { status: 500 }),
      ),
    );

    const { result } = renderHook(() => useRecipeDetails(["r1", "r2", "r3"]), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.resolutionsById.r1).toEqual({
      status: "loaded",
      detail: loaded,
    });
    expect(result.current.resolutionsById.r2).toEqual({ status: "missing" });
    expect(result.current.resolutionsById.r3).toEqual({ status: "error" });
  });

  it("reports loading while any recipe query is pending", async () => {
    seedMockRecipes([{ ...testRecipeDetail, id: "r1" }]);

    const { result } = renderHook(() => useRecipeDetails(["r1"]), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.resolutionsById.r1?.status).toBe("loaded");
  });

  it("returns an empty map with no ids", () => {
    const { result } = renderHook(() => useRecipeDetails([]), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.resolutionsById).toEqual({});
  });
});

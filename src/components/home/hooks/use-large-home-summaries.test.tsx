import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { setupMswServer } from "@/test/mocks/server";
import { renderHook, waitFor } from "@/test/test-utils";
import { useLargeHomeSummaries } from "./use-large-home-summaries";

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}

describe("useLargeHomeSummaries", () => {
  setupMswServer();

  it("returns Chores, Meals, and Lists summaries from existing queries", async () => {
    const { result } = renderHook(
      () => useLargeHomeSummaries({ now: new Date(2026, 4, 17, 12) }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.chores.module).toBe("chores");
      expect(result.current.meals.module).toBe("meals");
      expect(result.current.lists.module).toBe("lists");
      expect(result.current.chores.kind).toBe("empty");
      expect(result.current.meals.kind).toBe("missing");
      expect(result.current.lists.kind).toBe("quiet");
    });
  });
});

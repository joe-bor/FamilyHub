import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useLogout } from "./use-auth";

let queryClient: QueryClient;

function createWrapper() {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

const originalLocation = window.location;

beforeEach(() => {
  queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  Object.defineProperty(window, "location", {
    configurable: true,
    value: originalLocation,
  });
});

describe("useLogout", () => {
  it("still clears the query cache and reloads when storage removal throws", () => {
    const reload = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...originalLocation, reload },
    });
    // Simulate a storage-disabled webview where removeItem throws.
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("storage disabled");
    });
    const clearSpy = vi.spyOn(queryClient, "clear");

    const { result } = renderHook(() => useLogout(), {
      wrapper: createWrapper(),
    });

    expect(() => result.current()).not.toThrow();
    expect(clearSpy).toHaveBeenCalled();
    expect(reload).toHaveBeenCalled();
  });
});

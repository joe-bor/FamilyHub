import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as offlinePersister from "@/lib/offline/persister";
import { useLogout } from "./use-auth";

// `clearOfflineReadCache`'s actual IndexedDB clearing is covered in
// src/lib/offline/persister.test.ts. Here we spy on the shared module export
// (vitest preloads this graph via setup.ts, so vi.spyOn on the live namespace
// is the reliable seam) to assert logout invokes it before reloading.

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
  it("clears the persisted offline read cache before reloading", async () => {
    const clearSpy = vi
      .spyOn(offlinePersister, "clearOfflineReadCache")
      .mockResolvedValue(undefined);
    const reload = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...originalLocation, reload },
    });

    const { result } = renderHook(() => useLogout(), {
      wrapper: createWrapper(),
    });

    await result.current();

    expect(clearSpy).toHaveBeenCalledTimes(1);
    expect(reload).toHaveBeenCalled();
    // Must be awaited BEFORE the reload to prevent cross-account leakage on
    // shared devices.
    expect(clearSpy.mock.invocationCallOrder[0]).toBeLessThan(
      reload.mock.invocationCallOrder[0],
    );
  });

  it("still clears the query cache and reloads when storage removal throws", async () => {
    vi.spyOn(offlinePersister, "clearOfflineReadCache").mockResolvedValue(
      undefined,
    );
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

    await expect(result.current()).resolves.toBeUndefined();
    expect(clearSpy).toHaveBeenCalled();
    expect(reload).toHaveBeenCalled();
  });
});

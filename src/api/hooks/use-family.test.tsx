import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import type { ReactNode } from "react";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { FAMILY_STORAGE_KEY } from "@/lib/constants";
import type { FamilyApiResponse, FamilyData, FamilyMember } from "@/lib/types";
import { resetMockFamily, seedMockFamily } from "@/test/mocks/handlers";
import { server } from "@/test/mocks/server";
import {
  familyKeys,
  readFamilyFromStorage,
  useAddMember,
  useCreateFamily,
  useDeleteFamily,
  useFamily,
  useFamilyData,
  useFamilyMemberById,
  useFamilyMemberMap,
  useFamilyMembers,
  useFamilyName,
  useRemoveMember,
  useSetupComplete,
  useUnusedColors,
  useUpdateFamily,
  useUpdateMember,
} from "./use-family";

// ============================================================================
// Test Data
// ============================================================================

const testMember1: FamilyMember = {
  id: "member-1",
  name: "Alice",
  color: "coral",
};

const testMember2: FamilyMember = {
  id: "member-2",
  name: "Bob",
  color: "teal",
};

const testFamily: FamilyData = {
  id: "family-1",
  name: "Test Family",
  members: [testMember1, testMember2],
  createdAt: "2025-01-01T00:00:00.000Z",
  setupComplete: true,
};

// ============================================================================
// Test Setup
// ============================================================================

let queryClient: QueryClient;

function createWrapper() {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

// MSW server setup
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterAll(() => server.close());

beforeEach(() => {
  queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: Infinity },
      mutations: { retry: false },
    },
  });
  localStorage.clear();
  resetMockFamily();
});

afterEach(() => {
  queryClient.clear();
  server.resetHandlers();
});

// ============================================================================
// localStorage Helper Tests
// ============================================================================

describe("readFamilyFromStorage", () => {
  it("returns null when localStorage is empty", () => {
    const result = readFamilyFromStorage();
    expect(result).toBeNull();
  });

  it("returns family data from localStorage", () => {
    const stored = {
      state: { family: testFamily, _hasHydrated: true },
      version: 0,
    };
    localStorage.setItem(FAMILY_STORAGE_KEY, JSON.stringify(stored));

    const result = readFamilyFromStorage();
    expect(result).toEqual(testFamily);
  });

  it("returns null for invalid JSON", () => {
    localStorage.setItem(FAMILY_STORAGE_KEY, "invalid-json");

    const result = readFamilyFromStorage();
    expect(result).toBeNull();
  });

  it("returns null when family is missing from stored data", () => {
    const stored = { state: {}, version: 0 };
    localStorage.setItem(FAMILY_STORAGE_KEY, JSON.stringify(stored));

    const result = readFamilyFromStorage();
    expect(result).toBeNull();
  });
});

// ============================================================================
// Query Key Factory Tests
// ============================================================================

describe("familyKeys", () => {
  it("generates correct key structure", () => {
    expect(familyKeys.all).toEqual(["family"]);
    expect(familyKeys.family()).toEqual(["family", "data"]);
  });
});

// ============================================================================
// Selector Hook Tests
// ============================================================================

describe("useFamily", () => {
  it("returns undefined when no data exists and no localStorage", async () => {
    const { result } = renderHook(() => useFamily(), {
      wrapper: createWrapper(),
    });

    // No localStorage data, no query data
    expect(result.current.data).toBeUndefined();
  });

  it("seeds initial data from localStorage", () => {
    // Seed localStorage before rendering
    const stored = {
      state: { family: testFamily, _hasHydrated: true },
      version: 0,
    };
    localStorage.setItem(FAMILY_STORAGE_KEY, JSON.stringify(stored));

    const { result } = renderHook(() => useFamily(), {
      wrapper: createWrapper(),
    });

    // Should have initial data immediately from localStorage
    expect(result.current.data?.data).toEqual(testFamily);
  });
});

describe("useFamilyData", () => {
  it("returns null when no family exists", () => {
    const { result } = renderHook(() => useFamilyData(), {
      wrapper: createWrapper(),
    });

    expect(result.current).toBeNull();
  });

  it("returns family data when present", () => {
    // Seed query cache
    queryClient.setQueryData<FamilyApiResponse>(familyKeys.family(), {
      data: testFamily,
    });

    const { result } = renderHook(() => useFamilyData(), {
      wrapper: createWrapper(),
    });

    expect(result.current).toEqual(testFamily);
  });
});

describe("useFamilyMembers", () => {
  it("returns empty array when no family exists", () => {
    const { result } = renderHook(() => useFamilyMembers(), {
      wrapper: createWrapper(),
    });

    expect(result.current).toEqual([]);
  });

  it("returns members array when present", () => {
    queryClient.setQueryData<FamilyApiResponse>(familyKeys.family(), {
      data: testFamily,
    });

    const { result } = renderHook(() => useFamilyMembers(), {
      wrapper: createWrapper(),
    });

    expect(result.current).toEqual([testMember1, testMember2]);
  });
});

describe("useFamilyName", () => {
  it("returns empty string when no family exists", () => {
    const { result } = renderHook(() => useFamilyName(), {
      wrapper: createWrapper(),
    });

    expect(result.current).toBe("");
  });

  it("returns family name when present", () => {
    queryClient.setQueryData<FamilyApiResponse>(familyKeys.family(), {
      data: testFamily,
    });

    const { result } = renderHook(() => useFamilyName(), {
      wrapper: createWrapper(),
    });

    expect(result.current).toBe("Test Family");
  });
});

describe("useSetupComplete", () => {
  it("returns false when not fetched", () => {
    const { result } = renderHook(() => useSetupComplete(), {
      wrapper: createWrapper(),
    });

    expect(result.current).toBe(false);
  });

  it("returns true when setup is complete", async () => {
    queryClient.setQueryData<FamilyApiResponse>(familyKeys.family(), {
      data: testFamily,
    });

    const { result } = renderHook(() => useSetupComplete(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });

  it("returns false when family exists but setup is not complete", async () => {
    const incompleteFamily = { ...testFamily, setupComplete: false };
    queryClient.setQueryData<FamilyApiResponse>(familyKeys.family(), {
      data: incompleteFamily,
    });

    const { result } = renderHook(() => useSetupComplete(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current).toBe(false);
    });
  });
});

describe("useFamilyMemberById", () => {
  beforeEach(() => {
    queryClient.setQueryData<FamilyApiResponse>(familyKeys.family(), {
      data: testFamily,
    });
  });

  it("returns member when found", () => {
    const { result } = renderHook(() => useFamilyMemberById("member-1"), {
      wrapper: createWrapper(),
    });

    expect(result.current).toEqual(testMember1);
  });

  it("returns undefined when member not found", () => {
    const { result } = renderHook(() => useFamilyMemberById("nonexistent"), {
      wrapper: createWrapper(),
    });

    expect(result.current).toBeUndefined();
  });
});

describe("useFamilyMemberMap", () => {
  it("returns empty map when no members", () => {
    const { result } = renderHook(() => useFamilyMemberMap(), {
      wrapper: createWrapper(),
    });

    expect(result.current.size).toBe(0);
  });

  it("returns map with O(1) lookups", () => {
    queryClient.setQueryData<FamilyApiResponse>(familyKeys.family(), {
      data: testFamily,
    });

    const { result } = renderHook(() => useFamilyMemberMap(), {
      wrapper: createWrapper(),
    });

    expect(result.current.size).toBe(2);
    expect(result.current.get("member-1")).toEqual(testMember1);
    expect(result.current.get("member-2")).toEqual(testMember2);
  });

  it("returns same map instance for same members (memoized)", () => {
    queryClient.setQueryData<FamilyApiResponse>(familyKeys.family(), {
      data: testFamily,
    });

    const { result, rerender } = renderHook(() => useFamilyMemberMap(), {
      wrapper: createWrapper(),
    });

    const firstMap = result.current;
    rerender();
    const secondMap = result.current;

    // Same reference means memoization is working
    expect(firstMap).toBe(secondMap);
  });
});

describe("useUnusedColors", () => {
  it("returns all colors when no members", () => {
    const { result } = renderHook(() => useUnusedColors(), {
      wrapper: createWrapper(),
    });

    expect(result.current).toHaveLength(7); // All 7 family colors
  });

  it("filters out used colors", () => {
    queryClient.setQueryData<FamilyApiResponse>(familyKeys.family(), {
      data: testFamily,
    });

    const { result } = renderHook(() => useUnusedColors(), {
      wrapper: createWrapper(),
    });

    expect(result.current).toHaveLength(5); // 7 - 2 used (coral, teal)
    expect(result.current).not.toContain("coral");
    expect(result.current).not.toContain("teal");
  });

  it("returns same array instance for same members (memoized)", () => {
    queryClient.setQueryData<FamilyApiResponse>(familyKeys.family(), {
      data: testFamily,
    });

    const { result, rerender } = renderHook(() => useUnusedColors(), {
      wrapper: createWrapper(),
    });

    const firstArray = result.current;
    rerender();
    const secondArray = result.current;

    // Same reference means memoization is working
    expect(firstArray).toBe(secondArray);
  });
});

// ============================================================================
// Mutation Hook Tests
// ============================================================================

describe("useCreateFamily", () => {
  it("creates a family and updates query cache on success", async () => {
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useCreateFamily({ onSuccess }), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      name: "New Family",
      members: [{ name: "Alice", color: "coral" }],
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Check callback was called with response data
    expect(onSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "New Family",
          setupComplete: true,
        }),
      }),
    );
  });

  it("writes family to localStorage on success", async () => {
    const { result } = renderHook(() => useCreateFamily(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      name: "Persisted Family",
      members: [{ name: "Bob", color: "teal" }],
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Check localStorage was updated
    const stored = localStorage.getItem(FAMILY_STORAGE_KEY);
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed.state.family.name).toBe("Persisted Family");
  });
});

describe("useUpdateFamily", () => {
  beforeEach(() => {
    // Seed MSW mock with existing family
    seedMockFamily(testFamily);
    queryClient.setQueryData<FamilyApiResponse>(familyKeys.family(), {
      data: testFamily,
    });
  });

  it("updates family name successfully", async () => {
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useUpdateFamily({ onSuccess }), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ name: "Updated Family" });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(onSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "Updated Family",
        }),
      }),
    );
  });

  it("writes updated family to localStorage", async () => {
    const { result } = renderHook(() => useUpdateFamily(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ name: "LocalStorage Family" });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const stored = localStorage.getItem(FAMILY_STORAGE_KEY);
    const parsed = JSON.parse(stored!);
    expect(parsed.state.family.name).toBe("LocalStorage Family");
  });
});

describe("useAddMember", () => {
  beforeEach(() => {
    // Seed MSW mock with existing family
    seedMockFamily(testFamily);
    queryClient.setQueryData<FamilyApiResponse>(familyKeys.family(), {
      data: testFamily,
    });
  });

  it("adds a member successfully", async () => {
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useAddMember({ onSuccess }), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ name: "Charlie", color: "green" });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Member should have a real ID (not temp)
    expect(onSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "Charlie",
          color: "green",
          id: expect.not.stringMatching(/^temp-/),
        }),
      }),
    );
  });

  it("calls onSuccess callback with member data", async () => {
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useAddMember({ onSuccess }), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ name: "Diana", color: "purple" });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(onSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "Diana",
          color: "purple",
        }),
      }),
    );
  });
});

describe("useRemoveMember", () => {
  beforeEach(() => {
    // Seed MSW mock with existing family
    seedMockFamily(testFamily);
    queryClient.setQueryData<FamilyApiResponse>(familyKeys.family(), {
      data: testFamily,
    });
  });

  it("removes a member successfully", async () => {
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useRemoveMember({ onSuccess }), {
      wrapper: createWrapper(),
    });

    // Remove member-1 (Alice)
    result.current.mutate("member-1");

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(onSuccess).toHaveBeenCalled();
  });

  it("calls onSuccess callback", async () => {
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useRemoveMember({ onSuccess }), {
      wrapper: createWrapper(),
    });

    result.current.mutate("member-2");

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(onSuccess).toHaveBeenCalled();
  });

  it("updates localStorage after removal", async () => {
    const { result } = renderHook(() => useRemoveMember(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("member-1");

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const stored = localStorage.getItem(FAMILY_STORAGE_KEY);
    const parsed = JSON.parse(stored!);
    expect(parsed.state.family.members).toHaveLength(1);
    expect(
      parsed.state.family.members.some(
        (m: FamilyMember) => m.id === "member-1",
      ),
    ).toBe(false);
  });
});

describe("useUpdateMember", () => {
  beforeEach(() => {
    seedMockFamily(testFamily);
    queryClient.setQueryData<FamilyApiResponse>(familyKeys.family(), {
      data: testFamily,
    });
  });

  it("updates a member successfully", async () => {
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useUpdateMember({ onSuccess }), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      id: "member-1",
      name: "Alice Updated",
      color: "coral",
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(onSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          id: "member-1",
          name: "Alice Updated",
        }),
      }),
    );
  });

  it("updates localStorage after member update", async () => {
    const { result } = renderHook(() => useUpdateMember(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ id: "member-1", name: "Alice", color: "purple" });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const stored = localStorage.getItem(FAMILY_STORAGE_KEY);
    const parsed = JSON.parse(stored!);
    const updatedMember = parsed.state.family.members.find(
      (m: FamilyMember) => m.id === "member-1",
    );
    expect(updatedMember.color).toBe("purple");
  });
});

describe("useDeleteFamily", () => {
  // Use separate queryClient with longer gcTime
  let deleteQueryClient: QueryClient;

  function createDeleteWrapper() {
    return function Wrapper({ children }: { children: ReactNode }) {
      return (
        <QueryClientProvider client={deleteQueryClient}>
          {children}
        </QueryClientProvider>
      );
    };
  }

  beforeEach(() => {
    deleteQueryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: Infinity, staleTime: Infinity },
        mutations: { retry: false },
      },
    });
    seedMockFamily(testFamily);
    deleteQueryClient.setQueryData<FamilyApiResponse>(familyKeys.family(), {
      data: testFamily,
    });
    // Also seed localStorage
    const stored = {
      state: { family: testFamily, _hasHydrated: true },
      version: 0,
    };
    localStorage.setItem(FAMILY_STORAGE_KEY, JSON.stringify(stored));
  });

  afterEach(() => {
    deleteQueryClient.clear();
  });

  it("clears family from query cache on success", async () => {
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useDeleteFamily({ onSuccess }), {
      wrapper: createDeleteWrapper(),
    });

    result.current.mutate();

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(onSuccess).toHaveBeenCalled();

    const data = deleteQueryClient.getQueryData<FamilyApiResponse>(
      familyKeys.family(),
    );
    expect(data?.data).toBeNull();
  });

  it("clears localStorage on success", async () => {
    const { result } = renderHook(() => useDeleteFamily(), {
      wrapper: createDeleteWrapper(),
    });

    result.current.mutate();

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const stored = localStorage.getItem(FAMILY_STORAGE_KEY);
    expect(stored).toBeNull();
  });
});

// ============================================================================
// Optimistic Update Tests
// ============================================================================

describe("optimistic updates", () => {
  // Use separate queryClient with longer gcTime for optimistic update tests
  let optimisticQueryClient: QueryClient;

  function createOptimisticWrapper() {
    return function Wrapper({ children }: { children: ReactNode }) {
      return (
        <QueryClientProvider client={optimisticQueryClient}>
          {children}
        </QueryClientProvider>
      );
    };
  }

  beforeEach(() => {
    optimisticQueryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: Infinity, staleTime: Infinity },
        mutations: { retry: false },
      },
    });
    seedMockFamily(testFamily);
    optimisticQueryClient.setQueryData<FamilyApiResponse>(familyKeys.family(), {
      data: testFamily,
    });
  });

  afterEach(() => {
    optimisticQueryClient.clear();
  });

  it("useUpdateFamily updates cache optimistically and completes successfully", async () => {
    const { result } = renderHook(() => useUpdateFamily(), {
      wrapper: createOptimisticWrapper(),
    });

    result.current.mutate({ name: "Optimistic Name" });

    // Wait for mutation to complete - cache should have optimistic value
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const cached = optimisticQueryClient.getQueryData<FamilyApiResponse>(
      familyKeys.family(),
    );
    expect(cached?.data?.name).toBe("Optimistic Name");
  });

  it("useAddMember adds member and replaces temp ID on success", async () => {
    const { result } = renderHook(() => useAddMember(), {
      wrapper: createOptimisticWrapper(),
    });

    result.current.mutate({ name: "Temp Member", color: "green" });

    // After success, temp ID should be replaced with real ID
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const cached = optimisticQueryClient.getQueryData<FamilyApiResponse>(
      familyKeys.family(),
    );
    // Should have 3 members now (original 2 + 1 new)
    expect(cached?.data?.members).toHaveLength(3);
    // No temp IDs should remain
    expect(cached?.data?.members.some((m) => m.id.startsWith("temp-"))).toBe(
      false,
    );
    // New member should exist
    expect(cached?.data?.members.some((m) => m.name === "Temp Member")).toBe(
      true,
    );
  });

  it("useRemoveMember removes member from cache", async () => {
    const { result } = renderHook(() => useRemoveMember(), {
      wrapper: createOptimisticWrapper(),
    });

    result.current.mutate("member-1");

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const cached = optimisticQueryClient.getQueryData<FamilyApiResponse>(
      familyKeys.family(),
    );
    expect(
      cached?.data?.members.find((m) => m.id === "member-1"),
    ).toBeUndefined();
    expect(cached?.data?.members).toHaveLength(1);
  });
});

// ============================================================================
// Rollback on Error Tests
// ============================================================================

describe("rollback on error", () => {
  // Use separate queryClient with longer gcTime for rollback tests
  let rollbackQueryClient: QueryClient;

  function createRollbackWrapper() {
    return function Wrapper({ children }: { children: ReactNode }) {
      return (
        <QueryClientProvider client={rollbackQueryClient}>
          {children}
        </QueryClientProvider>
      );
    };
  }

  beforeEach(() => {
    rollbackQueryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: Infinity, staleTime: Infinity },
        mutations: { retry: false },
      },
    });
    seedMockFamily(testFamily);
    rollbackQueryClient.setQueryData<FamilyApiResponse>(familyKeys.family(), {
      data: testFamily,
    });
  });

  afterEach(() => {
    rollbackQueryClient.clear();
  });

  it("useUpdateFamily restores previous state on server error", async () => {
    // Override handler to return error
    server.use(
      http.put("http://localhost:3000/family", () => {
        return HttpResponse.json({ message: "Server error" }, { status: 500 });
      }),
    );

    const onError = vi.fn();
    const { result } = renderHook(() => useUpdateFamily({ onError }), {
      wrapper: createRollbackWrapper(),
    });

    result.current.mutate({ name: "Should Rollback" });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    // Verify rollback to original value
    const cached = rollbackQueryClient.getQueryData<FamilyApiResponse>(
      familyKeys.family(),
    );
    expect(cached?.data?.name).toBe("Test Family");
    expect(onError).toHaveBeenCalled();
  });

  it("useAddMember removes optimistic member on server error", async () => {
    server.use(
      http.post("http://localhost:3000/family/members", () => {
        return HttpResponse.json({ message: "Server error" }, { status: 500 });
      }),
    );

    const onError = vi.fn();
    const { result } = renderHook(() => useAddMember({ onError }), {
      wrapper: createRollbackWrapper(),
    });

    result.current.mutate({ name: "Failed Member", color: "green" });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    // Verify optimistic member was removed
    const cached = rollbackQueryClient.getQueryData<FamilyApiResponse>(
      familyKeys.family(),
    );
    expect(cached?.data?.members).toHaveLength(2); // Original count
    expect(
      cached?.data?.members.find((m) => m.name === "Failed Member"),
    ).toBeUndefined();
    expect(onError).toHaveBeenCalled();
  });

  it("useRemoveMember restores member on server error", async () => {
    server.use(
      http.delete("http://localhost:3000/family/members/:id", () => {
        return HttpResponse.json({ message: "Server error" }, { status: 500 });
      }),
    );

    const onError = vi.fn();
    const { result } = renderHook(() => useRemoveMember({ onError }), {
      wrapper: createRollbackWrapper(),
    });

    result.current.mutate("member-1");

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    // Verify member was restored
    const cached = rollbackQueryClient.getQueryData<FamilyApiResponse>(
      familyKeys.family(),
    );
    expect(
      cached?.data?.members.find((m) => m.id === "member-1"),
    ).toBeDefined();
    expect(onError).toHaveBeenCalled();
  });

  it("useUpdateMember restores original member data on server error", async () => {
    server.use(
      http.put("http://localhost:3000/family/members/:id", () => {
        return HttpResponse.json({ message: "Server error" }, { status: 500 });
      }),
    );

    const onError = vi.fn();
    const { result } = renderHook(() => useUpdateMember({ onError }), {
      wrapper: createRollbackWrapper(),
    });

    result.current.mutate({
      id: "member-1",
      name: "Should Rollback",
      color: "coral",
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    // Verify original member data restored
    const cached = rollbackQueryClient.getQueryData<FamilyApiResponse>(
      familyKeys.family(),
    );
    const member = cached?.data?.members.find((m) => m.id === "member-1");
    expect(member?.name).toBe("Alice"); // Original name
    expect(onError).toHaveBeenCalled();
  });
});

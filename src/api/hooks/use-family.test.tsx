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
      meta: { timestamp: Date.now(), requestId: "test" },
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
      meta: { timestamp: Date.now(), requestId: "test" },
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
      meta: { timestamp: Date.now(), requestId: "test" },
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
      meta: { timestamp: Date.now(), requestId: "test" },
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
      meta: { timestamp: Date.now(), requestId: "test" },
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
      meta: { timestamp: Date.now(), requestId: "test" },
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
      meta: { timestamp: Date.now(), requestId: "test" },
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
      meta: { timestamp: Date.now(), requestId: "test" },
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
      meta: { timestamp: Date.now(), requestId: "test" },
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
      meta: { timestamp: Date.now(), requestId: "test" },
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
      meta: { timestamp: Date.now(), requestId: "test" },
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
      meta: { timestamp: Date.now(), requestId: "test" },
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
      meta: { timestamp: Date.now(), requestId: "test" },
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

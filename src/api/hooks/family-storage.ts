import type { QueryClient } from "@tanstack/react-query";
import { FAMILY_STORAGE_KEY } from "@/lib/constants";
import type { FamilyApiResponse, FamilyData } from "@/lib/types";
import { validateFamilyData } from "@/lib/validations/family";

// Query keys and localStorage helpers for family data live in this
// React-free module (no @/stores import) so family-store.ts can run its
// module-scope hydration without re-entering use-family.ts mid-evaluation.
// Importing them from use-family.ts created a cycle
// (use-family → @/stores → family-store → use-family) that left the
// `familyKeys` const in its temporal dead zone during boot.

// ============================================================================
// Query Keys Factory
// ============================================================================

export const familyKeys = {
  all: ["family"] as const,
  family: () => [...familyKeys.all, "data"] as const,
};

// ============================================================================
// localStorage Helpers
// ============================================================================

/**
 * Write family data to localStorage for:
 * 1. Instant startup on next page load (cache seeding)
 * 2. Cross-tab sync via storage events
 */
export function writeFamilyToStorage(family: FamilyData | null): void {
  try {
    if (family === null) {
      localStorage.removeItem(FAMILY_STORAGE_KEY);
    } else {
      // Match Zustand persist format for compatibility
      const stored = {
        state: {
          family,
          _hasHydrated: true,
        },
        version: 0,
      };
      localStorage.setItem(FAMILY_STORAGE_KEY, JSON.stringify(stored));
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("Failed to write family to localStorage:", error);
    }
  }
}

/**
 * Read family data from localStorage for cache seeding.
 */
export function readFamilyFromStorage(): FamilyData | null {
  try {
    const stored = localStorage.getItem(FAMILY_STORAGE_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored);
    return validateFamilyData(parsed?.state?.family);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("Failed to read family from localStorage:", error);
    }
    return null;
  }
}

// ============================================================================
// Cross-Tab Sync Helper
// ============================================================================

/**
 * Sync family data from localStorage to query cache.
 * Called by the hydration init and storage event listener in family-store.ts.
 */
export function syncFamilyFromStorage(queryClient: QueryClient): void {
  const family = readFamilyFromStorage();
  queryClient.setQueryData<FamilyApiResponse>(familyKeys.family(), {
    data: family,
  });
}

import { create } from "zustand";
import { syncFamilyFromStorage } from "@/api/hooks/use-family";
import { FAMILY_STORAGE_KEY } from "@/lib/constants";
import { queryClient } from "@/providers/query-provider";

/**
 * Minimal family store - only handles hydration state.
 *
 * All family data and CRUD operations are now handled by TanStack Query hooks
 * in src/api/hooks/use-family.ts. This store only tracks whether we've
 * completed the initial localStorage read (hydration).
 *
 * @see useFamily, useFamilyMembers, useCreateFamily, etc. in @/api
 */
interface FamilyHydrationState {
  /**
   * Whether the initial localStorage read has completed.
   * Used to gate app rendering until we know if there's existing family data.
   */
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
}

export const useFamilyStore = create<FamilyHydrationState>()((set) => ({
  _hasHydrated: false,
  setHasHydrated: (state) => set({ _hasHydrated: state }),
}));

// ============================================================================
// Hydration Initialization
// ============================================================================

/**
 * Check if localStorage has family data and mark as hydrated.
 * This runs immediately on module load.
 */
function initializeHydration(): void {
  // In SSR/test environments, skip hydration
  if (typeof window === "undefined") {
    useFamilyStore.getState().setHasHydrated(true);
    return;
  }

  // Check if family data exists in localStorage
  try {
    const stored = localStorage.getItem(FAMILY_STORAGE_KEY);
    // We don't need to validate the data here - TanStack Query's initialData
    // will handle reading it, and the API layer validates on mutations
    // Just mark as hydrated since we've checked localStorage
    useFamilyStore.getState().setHasHydrated(true);

    // If there's stored data, it will be read by useFamily's initialData
    if (stored) {
      // Sync to query cache immediately (in case useFamily hasn't been called yet)
      syncFamilyFromStorage(queryClient);
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("Failed to check localStorage for family data:", error);
    }
    // Still mark as hydrated to prevent infinite loading
    useFamilyStore.getState().setHasHydrated(true);
  }
}

// Run hydration check immediately
initializeHydration();

// ============================================================================
// Selector
// ============================================================================

/**
 * Check if store has hydrated from localStorage.
 * Use this to gate app rendering until we know the hydration state.
 */
export const useHasHydrated = () =>
  useFamilyStore((state) => state._hasHydrated);

// ============================================================================
// Cross-Tab Synchronization
// ============================================================================

/**
 * Listen for localStorage changes from other tabs and sync the query cache.
 * This ensures family data stays in sync across multiple browser tabs.
 */
if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key === FAMILY_STORAGE_KEY) {
      // Sync the TanStack Query cache with the new localStorage data
      syncFamilyFromStorage(queryClient);
    }
  });
}

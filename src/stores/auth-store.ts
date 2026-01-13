import { create } from "zustand";
import { AUTH_TOKEN_STORAGE_KEY } from "@/lib/constants";

/**
 * Auth store - handles token hydration state.
 *
 * The actual auth operations (login, logout, etc.) are handled by TanStack Query
 * hooks in src/api/hooks/use-auth.ts. This store only tracks whether we've
 * completed the initial localStorage check for an existing token.
 *
 * @see useLogin, useRegister, useLogout in @/api
 */
interface AuthHydrationState {
  /**
   * Whether the initial localStorage read has completed.
   */
  _hasHydrated: boolean;

  /**
   * Whether a valid token exists in localStorage.
   * Updated during hydration and by auth operations.
   */
  isAuthenticated: boolean;

  setHasHydrated: (state: boolean) => void;
  setAuthenticated: (state: boolean) => void;
}

export const useAuthStore = create<AuthHydrationState>()((set) => ({
  _hasHydrated: false,
  isAuthenticated: false,
  setHasHydrated: (state) => set({ _hasHydrated: state }),
  setAuthenticated: (state) => set({ isAuthenticated: state }),
}));

// ============================================================================
// Hydration Initialization
// ============================================================================

/**
 * Check if localStorage has an auth token and mark as hydrated.
 * This runs immediately on module load.
 */
function initializeAuthHydration(): void {
  // In SSR/test environments, skip hydration
  if (typeof window === "undefined") {
    useAuthStore.getState().setHasHydrated(true);
    return;
  }

  try {
    const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    useAuthStore.getState().setAuthenticated(!!token);
    useAuthStore.getState().setHasHydrated(true);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("Failed to check localStorage for auth token:", error);
    }
    // Still mark as hydrated to prevent infinite loading
    useAuthStore.getState().setHasHydrated(true);
  }
}

// Run hydration check immediately
initializeAuthHydration();

// ============================================================================
// Selectors
// ============================================================================

/**
 * Check if auth store has hydrated from localStorage.
 * Use this to gate app rendering until we know the auth state.
 */
export const useAuthHasHydrated = () =>
  useAuthStore((state) => state._hasHydrated);

/**
 * Check if user is authenticated (has a token).
 */
export const useIsAuthenticated = () =>
  useAuthStore((state) => state.isAuthenticated);

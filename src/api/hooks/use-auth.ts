import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApiException } from "@/api/client";
import { authService } from "@/api/services";
import { AUTH_TOKEN_STORAGE_KEY, FAMILY_STORAGE_KEY } from "@/lib/constants";
import type {
  FamilyApiResponse,
  FamilyData,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  UsernameCheckResponse,
} from "@/lib/types";
import { familyKeys } from "./use-family";

// ============================================================================
// Query Keys Factory
// ============================================================================

export const authKeys = {
  all: ["auth"] as const,
  usernameCheck: (username: string) =>
    [...authKeys.all, "username", username] as const,
};

// ============================================================================
// Token Storage Helpers
// ============================================================================

/**
 * Get stored auth token from localStorage.
 */
export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Save auth token to localStorage.
 */
export function setStoredToken(token: string): void {
  try {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("Failed to save token to localStorage:", error);
    }
  }
}

/**
 * Remove auth token from localStorage.
 */
export function clearStoredToken(): void {
  try {
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("Failed to clear token from localStorage:", error);
    }
  }
}

/**
 * Write family data to localStorage (Zustand persist format).
 */
function writeFamilyToStorage(family: FamilyData): void {
  try {
    const stored = {
      state: {
        family,
        _hasHydrated: true,
      },
      version: 0,
    };
    localStorage.setItem(FAMILY_STORAGE_KEY, JSON.stringify(stored));
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("Failed to write family to localStorage:", error);
    }
  }
}

// ============================================================================
// Login Hook
// ============================================================================

interface LoginCallbacks {
  onSuccess?: (data: LoginResponse) => void;
  onError?: (error: ApiException) => void;
}

/**
 * Login mutation that stores token and updates family cache.
 */
export function useLogin(callbacks?: LoginCallbacks) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: LoginRequest) => authService.login(request),
    onSuccess: (response) => {
      // Store token
      setStoredToken(response.data.token);

      // Update family query cache
      queryClient.setQueryData<FamilyApiResponse>(familyKeys.family(), {
        data: response.data.family,
      });

      // Write family to localStorage for hydration
      writeFamilyToStorage(response.data.family);

      callbacks?.onSuccess?.(response);
    },
    onError: (error: ApiException) => {
      callbacks?.onError?.(error);
    },
  });
}

// ============================================================================
// Register Hook
// ============================================================================

interface RegisterCallbacks {
  onSuccess?: (data: RegisterResponse) => void;
  onError?: (error: ApiException) => void;
}

/**
 * Register mutation that creates family, stores token, and updates cache.
 */
export function useRegister(callbacks?: RegisterCallbacks) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: RegisterRequest) => authService.register(request),
    onSuccess: (response) => {
      // Store token
      setStoredToken(response.data.token);

      // Update family query cache
      queryClient.setQueryData<FamilyApiResponse>(familyKeys.family(), {
        data: response.data.family,
      });

      // Write family to localStorage for hydration
      writeFamilyToStorage(response.data.family);

      callbacks?.onSuccess?.(response);
    },
    onError: (error: ApiException) => {
      callbacks?.onError?.(error);
    },
  });
}

// ============================================================================
// Username Check Hook
// ============================================================================

/**
 * Check if a username is available.
 * Only runs when username is at least 3 characters.
 */
export function useCheckUsername(username: string, enabled = true) {
  return useQuery<UsernameCheckResponse, ApiException>({
    queryKey: authKeys.usernameCheck(username),
    queryFn: () => authService.checkUsername(username),
    enabled: enabled && username.length >= 3,
    staleTime: 30 * 1000, // 30 seconds
  });
}

// ============================================================================
// Logout Hook
// ============================================================================

/**
 * Returns a logout function that clears auth state and reloads the page.
 */
export function useLogout() {
  const queryClient = useQueryClient();

  return () => {
    // Clear token from storage
    clearStoredToken();

    // Clear family data from localStorage
    localStorage.removeItem(FAMILY_STORAGE_KEY);

    // Clear all query cache
    queryClient.clear();

    // Force page reload to reset all state
    window.location.reload();
  };
}

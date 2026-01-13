// ============================================================================
// Storage Keys
// ============================================================================

/**
 * localStorage key for family data.
 * Used by TanStack Query hooks, mock handlers, and cross-tab sync.
 *
 * Format: Zustand persist format for compatibility
 * { state: { family: FamilyData | null, _hasHydrated: boolean }, version: number }
 */
export const FAMILY_STORAGE_KEY = "family-hub-family";

/**
 * localStorage key for auth token.
 * Stores the JWT token for authenticated requests.
 */
export const AUTH_TOKEN_STORAGE_KEY = "family-hub-auth-token";

/**
 * localStorage key for mock user credentials.
 * Used only in mock mode for simulating auth backend.
 */
export const MOCK_USERS_STORAGE_KEY = "family-hub-mock-users";

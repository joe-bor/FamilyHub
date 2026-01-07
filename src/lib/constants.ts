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

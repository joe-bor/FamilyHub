import { useMemo } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useShallow } from "zustand/shallow";
import {
  type FamilyColor,
  type FamilyData,
  type FamilyMember,
  familyColors,
} from "@/lib/types";

interface FamilyState {
  // State
  family: FamilyData | null;
  _hasHydrated: boolean;

  // Actions
  initializeFamily: (name: string) => void;
  updateFamilyName: (name: string) => void;
  addMember: (member: Omit<FamilyMember, "id">) => void;
  updateMember: (
    id: string,
    updates: Partial<Omit<FamilyMember, "id">>,
  ) => void;
  removeMember: (id: string) => void;
  completeSetup: () => void;
  resetFamily: () => void;
  setMembers: (members: FamilyMember[]) => void;
  setHasHydrated: (state: boolean) => void;
}

export const useFamilyStore = create<FamilyState>()(
  persist(
    (set, get) => ({
      // Initial state
      family: null,
      _hasHydrated: false,

      // Actions
      initializeFamily: (name) => {
        set({
          family: {
            id: crypto.randomUUID(),
            name,
            members: [],
            createdAt: new Date().toISOString(),
            setupComplete: false,
          },
        });
      },

      updateFamilyName: (name) => {
        const { family } = get();
        if (family) {
          set({ family: { ...family, name } });
        }
      },

      addMember: (member) => {
        const { family } = get();
        if (family) {
          const newMember: FamilyMember = {
            ...member,
            id: crypto.randomUUID(),
          };
          set({
            family: {
              ...family,
              members: [...family.members, newMember],
            },
          });
        }
      },

      updateMember: (id, updates) => {
        const { family } = get();
        if (family) {
          set({
            family: {
              ...family,
              members: family.members.map((m) =>
                m.id === id ? { ...m, ...updates } : m,
              ),
            },
          });
        }
      },

      removeMember: (id) => {
        const { family } = get();
        if (family) {
          set({
            family: {
              ...family,
              members: family.members.filter((m) => m.id !== id),
            },
          });
        }
      },

      completeSetup: () => {
        const { family } = get();
        if (family) {
          set({
            family: { ...family, setupComplete: true },
          });
        }
      },

      resetFamily: () => {
        set({ family: null });
      },

      setMembers: (members) => {
        const { family } = get();
        if (family) {
          set({
            family: { ...family, members },
          });
        }
      },

      setHasHydrated: (state) => {
        set({ _hasHydrated: state });
      },
    }),
    {
      name: "family-hub-family",
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error("Failed to rehydrate family store:", error);
          // Clear corrupted data - will trigger onboarding
          localStorage.removeItem("family-hub-family");
        }
        state?.setHasHydrated(true);
      },
    },
  ),
);

// ============================================================================
// Selectors
// ============================================================================

/**
 * Get all family members.
 */
export const useFamilyMembers = () =>
  useFamilyStore((state) => state.family?.members ?? []);

/**
 * Get family name.
 */
export const useFamilyName = () =>
  useFamilyStore((state) => state.family?.name ?? "");

/**
 * Check if setup is complete.
 */
export const useSetupComplete = () =>
  useFamilyStore((state) => state.family?.setupComplete ?? false);

/**
 * Check if store has hydrated from localStorage.
 */
export const useHasHydrated = () =>
  useFamilyStore((state) => state._hasHydrated);

/**
 * Get a family member by ID.
 */
export const useFamilyMemberById = (id: string) =>
  useFamilyStore((state) => state.family?.members.find((m) => m.id === id));

/**
 * Get the family member map for O(1) lookups.
 * Memoized to prevent creating new Map on every render.
 */
export const useFamilyMemberMap = () => {
  const members = useFamilyMembers();
  return useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
};

/**
 * Compound selector for family actions.
 */
export const useFamilyActions = () =>
  useFamilyStore(
    useShallow((state) => ({
      initializeFamily: state.initializeFamily,
      updateFamilyName: state.updateFamilyName,
      addMember: state.addMember,
      updateMember: state.updateMember,
      removeMember: state.removeMember,
      completeSetup: state.completeSetup,
      resetFamily: state.resetFamily,
      setMembers: state.setMembers,
    })),
  );

/**
 * Get family data (null if not initialized).
 */
export const useFamilyData = () => useFamilyStore((state) => state.family);

/**
 * Get unused colors (colors not assigned to any member).
 * Memoized to prevent creating new array on every render.
 */
export const useUnusedColors = (): FamilyColor[] => {
  const members = useFamilyMembers();
  return useMemo(() => {
    const usedColors = new Set(members.map((m) => m.color));
    return familyColors.filter((c) => !usedColors.has(c));
  }, [members]);
};

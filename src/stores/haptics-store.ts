import { create } from "zustand";
import { persist } from "zustand/middleware";

export type HapticCategory = "taps" | "completions" | "back";

interface HapticsPreferenceState {
  enabled: boolean; // master, default false
  categories: Record<HapticCategory, boolean>; // each default true
  setEnabled: (on: boolean) => void;
  setCategory: (category: HapticCategory, on: boolean) => void;
}

/** localStorage key; also consumed by the test-harness store reset. */
export const HAPTICS_STORAGE_KEY = "family-hub-haptics";

export const useHapticsPreference = create<HapticsPreferenceState>()(
  persist(
    (set) => ({
      enabled: false,
      categories: { taps: true, completions: true, back: true },
      setEnabled: (on) => set({ enabled: on }),
      setCategory: (category, on) =>
        set((s) => ({ categories: { ...s.categories, [category]: on } })),
    }),
    {
      name: HAPTICS_STORAGE_KEY,
      partialize: (s) => ({ enabled: s.enabled, categories: s.categories }),
    },
  ),
);

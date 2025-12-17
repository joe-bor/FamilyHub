import { create } from "zustand"
import type { ChoreItem } from "@/lib/types"
import { generateSampleChores } from "@/lib/calendar-data"

interface ChoresState {
  chores: ChoreItem[]
  toggleChore: (id: string) => void
  addChore: (chore: Omit<ChoreItem, "id">) => void
  updateChore: (id: string, updates: Partial<ChoreItem>) => void
  deleteChore: (id: string) => void
}

export const useChoresStore = create<ChoresState>((set) => ({
  chores: generateSampleChores(),

  toggleChore: (id) =>
    set((state) => ({
      chores: state.chores.map((chore) =>
        chore.id === id ? { ...chore, completed: !chore.completed } : chore
      ),
    })),

  addChore: (choreData) =>
    set((state) => ({
      chores: [...state.chores, { ...choreData, id: `chore-${Date.now()}` }],
    })),

  updateChore: (id, updates) =>
    set((state) => ({
      chores: state.chores.map((chore) =>
        chore.id === id ? { ...chore, ...updates } : chore
      ),
    })),

  deleteChore: (id) =>
    set((state) => ({
      chores: state.chores.filter((chore) => chore.id !== id),
    })),
}))

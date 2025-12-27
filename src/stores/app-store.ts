import { create } from "zustand";

export type ModuleType = "calendar" | "lists" | "chores" | "meals" | "photos";

interface AppState {
  // State
  activeModule: ModuleType;
  isSidebarOpen: boolean;

  // Actions
  setActiveModule: (module: ModuleType) => void;
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Initial state
  activeModule: "calendar",
  isSidebarOpen: false,

  // Actions
  setActiveModule: (module) => set({ activeModule: module }),
  openSidebar: () => set({ isSidebarOpen: true }),
  closeSidebar: () => set({ isSidebarOpen: false }),
  toggleSidebar: () =>
    set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
}));

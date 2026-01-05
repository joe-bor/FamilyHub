import { create } from "zustand";

export type ModuleType = "calendar" | "lists" | "chores" | "meals" | "photos";

interface AppState {
  // State
  activeModule: ModuleType | null; // null = home dashboard (mobile only)
  isSidebarOpen: boolean;

  // Actions
  setActiveModule: (module: ModuleType | null) => void;
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Initial state - null shows home dashboard on mobile, desktop redirects to calendar
  activeModule: null,
  isSidebarOpen: false,

  // Actions
  setActiveModule: (module) => set({ activeModule: module }),
  openSidebar: () => set({ isSidebarOpen: true }),
  closeSidebar: () => set({ isSidebarOpen: false }),
  toggleSidebar: () =>
    set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
}));

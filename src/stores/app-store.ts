import { create } from "zustand";

export type ModuleType =
  | "calendar"
  | "lists"
  | "chores"
  | "meals"
  | "recipes"
  | "photos";

export type MealType = "breakfast" | "lunch" | "dinner";

export type MealPlacementDraft = {
  recipeId: string;
  requestedAtWeekStartDate: string;
  source:
    | { kind: "recipes-library" }
    | { kind: "meals-slot"; dayIndex: number; mealType: MealType };
};

export type RecipeCreationDraft = {
  requestedAtWeekStartDate: string;
  dayIndex: number;
  mealType: MealType;
  typedTitle: string;
};

interface AppState {
  // State
  activeModule: ModuleType | null; // null = home dashboard (mobile only)
  isSidebarOpen: boolean;
  mealPlacementDraft: MealPlacementDraft | null;
  recipeCreationDraft: RecipeCreationDraft | null;

  // Actions
  setActiveModule: (module: ModuleType | null) => void;
  startMealPlacementFromRecipe: (draft: MealPlacementDraft) => void;
  consumeMealPlacementDraft: () => MealPlacementDraft | null;
  startRecipeCreationFromMealSlot: (draft: RecipeCreationDraft) => void;
  consumeRecipeCreationDraft: () => RecipeCreationDraft | null;
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state - null shows home dashboard on mobile, desktop redirects to calendar
  activeModule: null,
  isSidebarOpen: false,
  mealPlacementDraft: null,
  recipeCreationDraft: null,

  // Actions
  setActiveModule: (module) => set({ activeModule: module }),
  startMealPlacementFromRecipe: (draft) =>
    set({ mealPlacementDraft: draft, activeModule: "meals" }),
  consumeMealPlacementDraft: () => {
    const draft = get().mealPlacementDraft;
    set({ mealPlacementDraft: null });
    return draft;
  },
  startRecipeCreationFromMealSlot: (draft) =>
    set({ recipeCreationDraft: draft, activeModule: "recipes" }),
  consumeRecipeCreationDraft: () => {
    const draft = get().recipeCreationDraft;
    set({ recipeCreationDraft: null });
    return draft;
  },
  openSidebar: () => set({ isSidebarOpen: true }),
  closeSidebar: () => set({ isSidebarOpen: false }),
  toggleSidebar: () =>
    set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
}));

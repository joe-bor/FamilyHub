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

export type CalendarEventIntent = {
  date: string;
  eventKey: string;
};

export type MealSlotIntent = {
  weekStartDate: string;
  dayIndex: number;
  mealType: MealType;
};

interface AppState {
  // State
  activeModule: ModuleType | null; // null = home dashboard (first-class surface on all screen sizes)
  isSidebarOpen: boolean;
  mealPlacementDraft: MealPlacementDraft | null;
  recipeCreationDraft: RecipeCreationDraft | null;
  listDetailIntent: string | null;
  calendarFocusDate: string | null;
  calendarEventIntent: CalendarEventIntent | null;
  mealSlotIntent: MealSlotIntent | null;

  // Actions
  setActiveModule: (module: ModuleType | null) => void;
  startMealPlacementFromRecipe: (draft: MealPlacementDraft) => void;
  consumeMealPlacementDraft: () => MealPlacementDraft | null;
  startRecipeCreationFromMealSlot: (draft: RecipeCreationDraft) => void;
  consumeRecipeCreationDraft: () => RecipeCreationDraft | null;
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;
  openListDetail: (listId: string) => void;
  consumeListDetailIntent: () => string | null;
  focusCalendarDate: (date: string) => void;
  consumeCalendarFocusDate: () => string | null;
  openCalendarEvent: (intent: CalendarEventIntent) => void;
  clearCalendarEventIntent: () => void;
  focusMealSlot: (intent: MealSlotIntent) => void;
  consumeMealSlotIntent: () => MealSlotIntent | null;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state - null shows the home dashboard on every screen size
  activeModule: null,
  isSidebarOpen: false,
  mealPlacementDraft: null,
  recipeCreationDraft: null,
  listDetailIntent: null,
  calendarFocusDate: null,
  calendarEventIntent: null,
  mealSlotIntent: null,

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
  openListDetail: (listId) =>
    set({ listDetailIntent: listId, activeModule: "lists" }),
  consumeListDetailIntent: () => {
    const v = get().listDetailIntent;
    set({ listDetailIntent: null });
    return v;
  },
  focusCalendarDate: (date) =>
    set({ calendarFocusDate: date, activeModule: "calendar" }),
  consumeCalendarFocusDate: () => {
    const v = get().calendarFocusDate;
    set({ calendarFocusDate: null });
    return v;
  },
  openCalendarEvent: (intent) =>
    set({
      calendarEventIntent: intent,
      calendarFocusDate: null,
      activeModule: "calendar",
    }),
  clearCalendarEventIntent: () => set({ calendarEventIntent: null }),
  focusMealSlot: (intent) =>
    set({ mealSlotIntent: intent, activeModule: "meals" }),
  consumeMealSlotIntent: () => {
    const v = get().mealSlotIntent;
    set({ mealSlotIntent: null });
    return v;
  },
}));

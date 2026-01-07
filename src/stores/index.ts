// App Store

// Re-export family data selectors from API layer for backwards compatibility
// These now use TanStack Query instead of Zustand
export {
  useFamilyData,
  useFamilyMemberById,
  useFamilyMemberMap,
  useFamilyMembers,
  useFamilyName,
  useSetupComplete,
  useUnusedColors,
} from "@/api";
export { type ModuleType, useAppStore } from "./app-store";
// Calendar Store
export {
  useCalendarActions,
  useCalendarState,
  useCalendarStore,
  useEditModalState,
  useEventDetailState,
  useFilterPillsState,
  useHasUserSetView,
  useIsViewingToday,
} from "./calendar-store";
// Module Stores
export { useChoresStore } from "./chores-store";
// Family Store - Hydration only (data selectors moved to @/api)
export { useFamilyStore, useHasHydrated } from "./family-store";
export { type List, type ListItem, useListsStore } from "./lists-store";
export { useMealsStore } from "./meals-store";
export { type Photo, usePhotosStore } from "./photos-store";

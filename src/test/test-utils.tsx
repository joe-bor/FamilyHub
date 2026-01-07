import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type RenderOptions, render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement, ReactNode } from "react";
import { type FamilyApiResponse, familyKeys } from "@/api";
import { FAMILY_STORAGE_KEY } from "@/lib/constants";
import type {
  CalendarEvent,
  CalendarViewType,
  FamilyData,
  FamilyMember,
  FilterState,
} from "@/lib/types";
import type { ModuleType } from "@/stores/app-store";
import { useAppStore } from "@/stores/app-store";
import { useCalendarStore } from "@/stores/calendar-store";
import { useFamilyStore } from "@/stores/family-store";
import { resetMockFamily, seedMockFamily } from "./mocks/handlers";

/**
 * Creates a fresh QueryClient for each test with testing-optimized defaults
 */
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

/**
 * Global test query client - used by seedFamilyStore and resetFamilyStore.
 * This is reset before each test in setup.ts.
 */
let testQueryClient: QueryClient = createTestQueryClient();

/**
 * Get the current test query client.
 * Use this when you need to interact with the query cache in tests.
 */
export function getTestQueryClient(): QueryClient {
  return testQueryClient;
}

/**
 * Reset the test query client (called in setup.ts afterEach).
 */
export function resetTestQueryClient(): void {
  testQueryClient.clear();
  testQueryClient = createTestQueryClient();
}

interface AllProvidersProps {
  children: ReactNode;
  queryClient?: QueryClient;
}

/**
 * Wrapper component that includes all providers needed for testing.
 * Uses the global test query client by default for consistent state across seeding and rendering.
 */
function AllProviders({ children, queryClient }: AllProvidersProps) {
  const client = queryClient ?? testQueryClient;

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  queryClient?: QueryClient;
}

/**
 * Custom render function that wraps components with all necessary providers.
 *
 * @example
 * // Basic usage
 * const { getByText } = render(<MyComponent />);
 *
 * @example
 * // With custom QueryClient
 * const queryClient = createTestQueryClient();
 * const { getByText } = render(<MyComponent />, { queryClient });
 */
function customRender(
  ui: ReactElement,
  { queryClient, ...options }: CustomRenderOptions = {},
) {
  return render(ui, {
    wrapper: ({ children }) => (
      <AllProviders queryClient={queryClient}>{children}</AllProviders>
    ),
    ...options,
  });
}

/**
 * Sets up userEvent with the rendered component.
 *
 * @example
 * const { user, getByRole } = renderWithUser(<MyButton />);
 * await user.click(getByRole('button'));
 */
function renderWithUser(ui: ReactElement, options?: CustomRenderOptions) {
  return {
    user: userEvent.setup(),
    ...customRender(ui, options),
  };
}

// Re-export everything from testing-library
export * from "@testing-library/react";
export { userEvent };

// Export custom utilities
export { customRender as render, renderWithUser, createTestQueryClient };

// =============================================================================
// Store Seeding Utilities
// =============================================================================

/**
 * Seed family data for tests.
 * Seeds both the TanStack Query cache and localStorage (for components that read directly).
 *
 * @example
 * seedFamilyStore({
 *   name: "Test Family",
 *   members: [{ id: "1", name: "John", color: "coral" }],
 *   setupComplete: true,
 * });
 */
export function seedFamilyStore(
  data: Partial<FamilyData> & { members: FamilyMember[] },
): void {
  // Build the full family data object
  const familyData: FamilyData = {
    id: data.id ?? crypto.randomUUID(),
    name: data.name ?? "Test Family",
    members: data.members,
    createdAt: data.createdAt ?? new Date().toISOString(),
    setupComplete: data.setupComplete !== false, // Default to true
  };

  // Seed TanStack Query cache
  const response: FamilyApiResponse = {
    data: familyData,
    meta: { timestamp: Date.now(), requestId: "test-seed" },
  };
  testQueryClient.setQueryData(familyKeys.family(), response);

  // Seed MSW mock (for background refetches that hit the API)
  seedMockFamily(familyData);

  // Seed localStorage (for components/hooks that read directly from it)
  const stored = {
    state: { family: familyData, _hasHydrated: true },
    version: 0,
  };
  localStorage.setItem(FAMILY_STORAGE_KEY, JSON.stringify(stored));

  // Mark Zustand store as hydrated
  useFamilyStore.getState().setHasHydrated(true);
}

/**
 * Reset family data to empty state.
 * Clears query cache, localStorage, MSW mock, and marks store as hydrated.
 */
export function resetFamilyStore(): void {
  // Clear query cache
  testQueryClient.setQueryData(familyKeys.family(), {
    data: null,
    meta: { timestamp: Date.now(), requestId: "test-reset" },
  });

  // Clear MSW mock
  resetMockFamily();

  // Clear localStorage
  localStorage.removeItem(FAMILY_STORAGE_KEY);

  // Mark as hydrated (so app doesn't show loading)
  useFamilyStore.getState().setHasHydrated(true);
}

/**
 * Seed calendar store with initial state for testing.
 * Uses direct setState to avoid side effects from actions (like hasUserSetView).
 *
 * @example
 * seedCalendarStore({
 *   currentDate: new Date("2025-01-15"),
 *   calendarView: "daily",
 *   filter: { selectedMembers: ["member-1"], showAllDayEvents: true },
 * });
 */
export function seedCalendarStore(data: {
  currentDate?: Date;
  calendarView?: CalendarViewType;
  hasUserSetView?: boolean;
  filter?: Partial<FilterState>;
  isAddEventModalOpen?: boolean;
  selectedEvent?: CalendarEvent | null;
  isDetailModalOpen?: boolean;
  editingEvent?: CalendarEvent | null;
  isEditModalOpen?: boolean;
}): void {
  const currentState = useCalendarStore.getState();

  // Use direct setState to avoid triggering action side effects
  useCalendarStore.setState({
    ...(data.currentDate !== undefined && { currentDate: data.currentDate }),
    ...(data.calendarView !== undefined && { calendarView: data.calendarView }),
    ...(data.hasUserSetView !== undefined && {
      hasUserSetView: data.hasUserSetView,
    }),
    ...(data.filter && {
      filter: {
        selectedMembers:
          data.filter.selectedMembers ?? currentState.filter.selectedMembers,
        showAllDayEvents:
          data.filter.showAllDayEvents ?? currentState.filter.showAllDayEvents,
      },
    }),
    ...(data.isAddEventModalOpen !== undefined && {
      isAddEventModalOpen: data.isAddEventModalOpen,
    }),
    ...(data.selectedEvent !== undefined && {
      selectedEvent: data.selectedEvent,
    }),
    ...(data.isDetailModalOpen !== undefined && {
      isDetailModalOpen: data.isDetailModalOpen,
    }),
    ...(data.editingEvent !== undefined && { editingEvent: data.editingEvent }),
    ...(data.isEditModalOpen !== undefined && {
      isEditModalOpen: data.isEditModalOpen,
    }),
  });
}

/**
 * Reset the calendar store to its initial state.
 * Uses direct setState to ensure clean state without side effects.
 */
export function resetCalendarStore(): void {
  useCalendarStore.setState({
    currentDate: new Date(),
    calendarView: "weekly",
    hasUserSetView: false,
    filter: { selectedMembers: [], showAllDayEvents: true },
    isAddEventModalOpen: false,
    selectedEvent: null,
    isDetailModalOpen: false,
    editingEvent: null,
    isEditModalOpen: false,
  });
}

/**
 * Reset the app store to its initial state.
 */
export function resetAppStore(): void {
  const store = useAppStore.getState();
  store.setActiveModule("calendar");
  store.closeSidebar();
}

/**
 * Seed the app store with initial state for testing.
 *
 * @example
 * seedAppStore({
 *   activeModule: "chores",
 *   isSidebarOpen: true,
 * });
 */
export function seedAppStore(data: {
  activeModule?: ModuleType;
  isSidebarOpen?: boolean;
}): void {
  const store = useAppStore.getState();

  if (data.activeModule !== undefined) {
    store.setActiveModule(data.activeModule);
  }
  if (data.isSidebarOpen !== undefined) {
    if (data.isSidebarOpen) {
      store.openSidebar();
    } else {
      store.closeSidebar();
    }
  }
}

/**
 * Reset all stores to their initial state.
 * Call this in afterEach to ensure test isolation.
 */
export function resetAllStores(): void {
  resetTestQueryClient();
  resetFamilyStore();
  resetCalendarStore();
  resetAppStore();
}

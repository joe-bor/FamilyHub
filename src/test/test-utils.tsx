import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type RenderOptions, render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement, ReactNode } from "react";
import type {
  CalendarViewType,
  FamilyData,
  FamilyMember,
  FilterState,
} from "@/lib/types";
import { useAppStore } from "@/stores/app-store";
import { useCalendarStore } from "@/stores/calendar-store";
import { useFamilyStore } from "@/stores/family-store";

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

interface AllProvidersProps {
  children: ReactNode;
  queryClient?: QueryClient;
}

/**
 * Wrapper component that includes all providers needed for testing
 */
function AllProviders({ children, queryClient }: AllProvidersProps) {
  const client = queryClient ?? createTestQueryClient();

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
 * Seed the family store with test data.
 * Call this before rendering components that depend on family data.
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
  const store = useFamilyStore.getState();

  // First initialize the family
  store.initializeFamily(data.name ?? "Test Family");

  // Then set members
  store.setMembers(data.members);

  // Complete setup if specified (default to true for convenience)
  if (data.setupComplete !== false) {
    store.completeSetup();
  }

  // Mark as hydrated (simulates localStorage rehydration)
  store.setHasHydrated(true);
}

/**
 * Reset the family store to its initial state.
 */
export function resetFamilyStore(): void {
  useFamilyStore.getState().resetFamily();
  useFamilyStore.getState().setHasHydrated(true);
}

/**
 * Seed calendar store with initial state for testing.
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
  filter?: Partial<FilterState>;
}): void {
  const store = useCalendarStore.getState();

  if (data.currentDate) {
    store.setDate(data.currentDate);
  }

  if (data.calendarView) {
    store.setCalendarView(data.calendarView);
  }

  if (data.filter) {
    const currentFilter = useCalendarStore.getState().filter;
    store.setFilter({
      selectedMembers:
        data.filter.selectedMembers ?? currentFilter.selectedMembers,
      showAllDayEvents:
        data.filter.showAllDayEvents ?? currentFilter.showAllDayEvents,
    });
  }
}

/**
 * Reset the calendar store to its initial state.
 */
export function resetCalendarStore(): void {
  const store = useCalendarStore.getState();
  store.setDate(new Date());
  store.setCalendarView("weekly");
  store.setFilter({ selectedMembers: [], showAllDayEvents: true });
  store.closeAddEventModal();
  store.closeDetailModal();
  store.closeEditModal();
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
 * Reset all stores to their initial state.
 * Call this in afterEach to ensure test isolation.
 */
export function resetAllStores(): void {
  resetFamilyStore();
  resetCalendarStore();
  resetAppStore();
}

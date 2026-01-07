import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

// =============================================================================
// Browser API Mocks
// =============================================================================

// Mock window.matchMedia (used by use-is-mobile.ts and responsive components)
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver (used by Radix UI primitives)
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver (used for lazy loading and scroll detection)
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
  root: null,
  rootMargin: "",
  thresholds: [],
}));

// Mock scrollTo (used by calendar views for auto-scrolling)
Element.prototype.scrollTo = vi.fn();
window.scrollTo = vi.fn();

// =============================================================================
// Zustand Store Reset
// =============================================================================

// Import stores directly to reset them (avoid circular deps with test-utils)
import { FAMILY_STORAGE_KEY } from "@/lib/constants";
import { useAppStore } from "@/stores/app-store";
import { useCalendarStore } from "@/stores/calendar-store";
import { useFamilyStore } from "@/stores/family-store";
import { resetTestQueryClient } from "@/test/test-utils";

/**
 * Reset all Zustand stores to initial state.
 * Called after each test to prevent state leakage.
 */
function resetAllStores(): void {
  // Reset family store (now only has hydration state)
  useFamilyStore.setState({
    _hasHydrated: false,
  });

  // Clear family data from localStorage
  localStorage.removeItem(FAMILY_STORAGE_KEY);

  // Reset calendar store
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

  // Reset app store
  useAppStore.setState({
    activeModule: "calendar",
    isSidebarOpen: false,
  });
}

// =============================================================================
// Test Lifecycle
// =============================================================================

// Clean state before each test (prevents Zustand persist leaking between tests)
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

// Cleanup after each test case
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.useRealTimers();
  resetAllStores();
  resetTestQueryClient();
});

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
});

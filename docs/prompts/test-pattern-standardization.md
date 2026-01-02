# Task: Standardize Test Patterns Across Store Tests

## Background

The test infrastructure was recently updated to provide global Zustand store cleanup in `src/test/setup.ts`. This ensures all stores are automatically reset after each test, preventing state leakage between tests.

**Current setup.ts behavior (afterEach):**
- Calls `vi.clearAllMocks()` - clears mock call history
- Calls `vi.useRealTimers()` - restores real timers
- Calls `resetAllStores()` - resets family, calendar, and app stores to initial state

**Current setup.ts behavior (beforeEach):**
- Clears `localStorage` and `sessionStorage`

## Problem

Store test files (`*-store.test.ts`) use **custom local `resetStore()` helpers** instead of the standard seeders from `src/test/test-utils.tsx`. While functional, this creates inconsistency with component tests that use the standard pattern.

## Goal

Refactor store test files to use the standard seeding pattern from `test-utils.tsx`, removing redundant code and aligning with component test patterns.

## Files to Refactor

### 1. `src/stores/calendar-store.test.ts`
**Current issues:**
- Lines 27-45: Local `resetStore()` helper with override parameter
- Multiple `beforeEach` blocks call `resetStore()` with specific overrides

**Note:** This file uses `resetStore(overrides)` to set specific initial states (e.g., specific dates for testing navigation). The refactor should preserve this capability.

### 2. `src/stores/family-store.test.ts`
**Current issues:**
- Lines 22-28: Local `resetStore()` helper
- Line 49: Redundant `localStorage.clear()` (already in setup.ts)
- Lines 30-43: `initializeWithMembers()` helper (may be useful to keep)

### 3. `src/stores/app-store.test.ts`
**Current issues:**
- Lines 5-11: Manual `beforeEach` state reset that duplicates setup.ts behavior

## Standard Pattern (from test-utils.tsx)

```typescript
// Available seeders in test-utils.tsx:
import {
  seedFamilyStore,      // Seeds family with name, members, setupComplete
  resetFamilyStore,     // Resets to null family, sets hasHydrated=true
  seedCalendarStore,    // Seeds with currentDate, calendarView, filter
  resetCalendarStore,   // Resets to default calendar state
  resetAppStore,        // Resets to default app state
  resetAllStores        // Resets all stores (called globally in setup.ts)
} from "@/test/test-utils"
```

**Component test pattern (to follow):**
```typescript
import { seedFamilyStore, seedCalendarStore } from "@/test/test-utils"

describe("MyComponent", () => {
  beforeEach(() => {
    // Only seed what the test needs
    seedFamilyStore({
      name: "Test Family",
      members: testMembers,
      setupComplete: true,
    });
  });
  // No afterEach needed - setup.ts handles cleanup globally

  it("does something", () => {
    // test code
  });
});
```

## Refactoring Tasks

### Task 1: Extend test-utils.tsx seeders if needed

Before refactoring the store tests, check if `seedCalendarStore()` needs to support additional overrides that the local `resetStore()` currently handles.

**Current `seedCalendarStore` signature:**
```typescript
function seedCalendarStore(data: {
  currentDate?: Date;
  calendarView?: CalendarViewType;
  filter?: Partial<FilterState>;
}): void
```

**Calendar store test may need:**
- `hasUserSetView?: boolean`
- `isAddEventModalOpen?: boolean`
- Modal-related state (`selectedEvent`, `editingEvent`, etc.)

### Task 2: Refactor `calendar-store.test.ts`

1. Remove the local `resetStore()` helper
2. Use `seedCalendarStore()` from test-utils (extend if needed)
3. Add comment: `// afterEach cleanup handled globally by setup.ts`
4. Ensure all tests still pass

### Task 3: Refactor `family-store.test.ts`

1. Remove the local `resetStore()` helper
2. Remove redundant `localStorage.clear()` call
3. Keep `initializeWithMembers()` if useful, or convert to use `seedFamilyStore()`
4. Use standard seeders from test-utils
5. Keep `vi.restoreAllMocks()` in afterEach (needed for console spy restoration - `clearAllMocks` doesn't restore implementations)

### Task 4: Refactor `app-store.test.ts`

1. Remove or simplify the `beforeEach` that manually resets state
2. Rely on setup.ts global reset, or use `resetAppStore()` if explicit reset needed
3. Add comment explaining cleanup is global

### Task 5: Verify all tests pass

```bash
npm run test:coverage
```

All 391 tests should pass after refactoring.

## Acceptance Criteria

- [ ] No local `resetStore()` helpers in store test files
- [ ] All store tests use seeders from `test-utils.tsx`
- [ ] Redundant `localStorage.clear()` calls removed
- [ ] Comments added explaining global cleanup pattern
- [ ] `seedCalendarStore()` extended if additional overrides needed
- [ ] All 391 tests pass
- [ ] Remove item from TECHNICAL-DEBT.md when complete

## Important Notes

1. **Don't break tests** - Run tests frequently during refactoring
2. **Console spies** - `family-store.test.ts` uses `vi.restoreAllMocks()` for console spies. This is intentional and should be kept because `vi.clearAllMocks()` only clears call history, not implementations.
3. **Test isolation** - Each test should work independently; don't rely on test execution order
4. **Preserve test behavior** - The goal is standardization, not changing what tests verify

## Reference Files

- `src/test/setup.ts` - Global test lifecycle hooks
- `src/test/test-utils.tsx` - Standard seeders and render helpers
- `src/components/calendar/calendar-module.test.tsx` - Example of correct pattern
- `src/components/calendar/components/event-form.test.tsx` - Example of correct pattern
- `docs/TECHNICAL-DEBT.md` - Item #4 in Low Priority section

## Commands

```bash
# Run all tests
npm run test

# Run specific test file
npm run test -- --run src/stores/calendar-store.test.ts

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode during development
npm run test -- src/stores/
```

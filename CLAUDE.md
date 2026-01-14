# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server at localhost:5173
npm run build        # Type-check with tsc then build with Vite
npm run lint         # Run Biome linter
npm run lint:fix     # Fix lint issues automatically
npm run format       # Format all files with Biome
npm run format:check # Check formatting without changes
npm run preview      # Preview production build
npm run test         # Run Vitest in watch mode
npm run test:ui      # Open Vitest UI
npm run test:coverage # Run tests with coverage report
npm run test:e2e     # Run Playwright E2E tests
npm run test:e2e:ui  # Open Playwright UI
```

## Architecture

FamilyHub is a family organization app built with React 19, Vite, and Tailwind CSS v4. It uses shadcn/ui patterns with Radix UI primitives.

### Core Structure

- **App.tsx** - Layout orchestrator composing AppHeader, NavigationTabs, SidebarMenu, and module views
- **src/api/** - API layer with TanStack Query hooks, services, and mock handlers
- **src/stores/** - Zustand stores for UI state management (app, calendar view preferences)
- **src/providers/** - React context providers (QueryProvider for TanStack Query)
- **src/lib/types/** - Centralized TypeScript types (`calendar.ts`, `family.ts`, `chores.ts`, `meals.ts`)
- **src/lib/validations/** - Zod schemas for form validation (`calendar.ts`)
- **src/lib/utils.ts** - `cn()` utility for Tailwind class merging
- **src/lib/time-utils.ts** - Centralized date/time utilities (parsing, formatting, timezone-safe operations)
- **src/lib/perf-utils.ts** - Performance measurement utilities (dev only)

### Component Organization

```
src/
├── api/                       # API layer (TanStack Query + services)
│   ├── client/                # HTTP client and error handling
│   │   ├── http-client.ts     # Fetch wrapper with interceptors
│   │   └── api-error.ts       # ApiException, ApiErrorCode
│   ├── hooks/                 # TanStack Query hooks
│   │   ├── use-calendar.ts    # useCalendarEvents, useCreateEvent, etc.
│   │   └── use-family.ts      # useFamily, useFamilyMembers, useCreateFamily, etc.
│   ├── services/              # API service functions
│   │   ├── calendar.service.ts # CRUD operations for calendar
│   │   └── family.service.ts  # CRUD operations for family/members
│   ├── mocks/                 # Mock API handlers (dev mode)
│   │   ├── calendar.mock.ts   # Mock event data and handlers
│   │   ├── family.mock.ts     # Mock family data with localStorage persistence
│   │   └── delay.ts           # Simulated network delay
│   └── index.ts               # Barrel exports
│
├── hooks/                     # Custom React hooks
│   ├── use-is-mobile.ts       # Mobile detection using matchMedia
│   └── index.ts               # Barrel exports
│
├── providers/                 # React context providers
│   └── query-provider.tsx     # TanStack Query setup with DevTools
│
├── stores/                    # Zustand UI state management
│   ├── app-store.ts           # App-wide state (activeModule, sidebar)
│   ├── auth-store.ts          # Authentication state (isAuthenticated, hydration)
│   ├── calendar-store.ts      # Calendar UI state (date, view, filters)
│   ├── family-store.ts        # Hydration state only (data lives in @/api)
│   └── index.ts               # Barrel exports + selectors
│
├── lib/
│   ├── types/                 # Centralized type definitions
│   │   ├── calendar.ts        # CalendarEvent, API types, CalendarViewType, FilterState
│   │   ├── family.ts          # FamilyMember, colorMap, familyMemberMap
│   │   ├── chores.ts          # ChoreItem
│   │   ├── meals.ts           # MealPlan
│   │   └── index.ts           # Barrel exports
│   ├── validations/           # Zod form schemas
│   │   └── calendar.ts        # eventFormSchema
│   ├── time-utils.ts          # Time/date utilities (see Date/Time Handling section)
│   └── perf-utils.ts          # measurePerformance (dev only)
│
├── components/
│   ├── ui/                    # Base UI primitives
│   │   ├── button, input, label   # Core form elements
│   │   ├── dialog, popover        # Overlay containers (Radix)
│   │   ├── calendar, date-picker  # Date selection (react-day-picker)
│   │   ├── time-picker            # Wheel-style time selector
│   │   ├── member-selector        # Family member pills
│   │   ├── scroll-area            # Scrollable container (Radix)
│   │   └── form-error             # Validation error display
│   ├── shared/                # App-wide components
│   │   ├── app-header.tsx     # Top bar (family name, date, weather, settings)
│   │   ├── navigation-tabs.tsx # Left sidebar module tabs
│   │   └── sidebar-menu.tsx   # Settings slide-out menu
│   │
│   ├── calendar/
│   │   ├── calendar-module.tsx # Module orchestrator (wires API hooks to views)
│   │   ├── views/             # DailyCalendar, WeeklyCalendar, MonthlyCalendar, ScheduleCalendar
│   │   └── components/        # CalendarNavigation, CalendarEventCard, FamilyFilterPills,
│   │                          # EventFormModal, EventForm, EventDetailModal, AddEventButton
│   │
│   └── *-view.tsx             # Other module views (ChoresView, MealsView, ListsView, PhotosView)
```

Barrel exports: Import from `@/api`, `@/components/calendar`, `@/components/shared`, `@/stores`, or `@/lib/types`.

### State Management

Uses a hybrid approach: **TanStack Query** for server state (API data) and **Zustand** for UI state.

**TanStack Query (Server State):**
- Calendar events fetched via `useCalendarEvents` hook
- Family data fetched via `useFamily` hook (localStorage-seeded for instant startup)
- Automatic caching, background refetching, and stale-while-revalidate
- Optimistic updates for mutations with rollback on error

**Zustand (UI State):**

**app-store.ts:**
- `activeModule` - Current module (calendar, chores, meals, lists, photos)
- `isSidebarOpen` / `openSidebar` / `closeSidebar` - Sidebar state

**auth-store.ts:**
- `isAuthenticated` - Whether user has valid auth token
- `_hasHydrated` - Whether localStorage token check is complete
- `useIsAuthenticated()` - Check auth status
- `useAuthHasHydrated()` - Gate rendering until auth check complete
- `setAuthenticated(value)` - Update auth state (called after login/logout)
- **Note:** Initializes on module load by checking localStorage for token

**family-store.ts:** (hydration gate only)
- `_hasHydrated` - Whether localStorage read is complete
- `useHasHydrated()` - Gate app rendering until hydrated
- **Note:** Family data (name, members) now lives in `@/api` via TanStack Query

**Family data hooks** (from `@/api`):
- `useFamilyMembers()` - Get family members array
- `useFamilyName()` - Get family name
- `useSetupComplete()` - Check if onboarding is complete
- `useFamilyMemberMap()` - O(1) member lookups
- `useUnusedColors()` - Colors not assigned to any member
- Mutations: `useCreateFamily`, `useUpdateFamily`, `useAddMember`, `useUpdateMember`, `useRemoveMember`, `useDeleteFamily`

**calendar-store.ts:**
- `currentDate`, `calendarView`, `filter` - Calendar UI preferences
- `goToPrevious`, `goToNext`, `goToToday` - View-aware navigation actions
- `useIsViewingToday` - Computed selector for "Today" button state
- `selectedEvent`, `isDetailModalOpen` - Event detail modal state
- `editingEvent`, `isEditModalOpen` - Edit modal state

**Compound selectors** (optimized with shallow comparison):
- `useCalendarState` - Returns `{ currentDate, calendarView, filter, isAddEventModalOpen }`
- `useCalendarActions` - Returns navigation + modal actions
- `useEventDetailState` - Returns `{ selectedEvent, isDetailModalOpen, openDetailModal, closeDetailModal }`
- `useEditModalState` - Returns `{ editingEvent, isEditModalOpen, openEditModal, closeEditModal }`
- `useFilterPillsState` - Returns `{ filter, setFilter }`

**Usage pattern:**
```typescript
import { useCalendarStore, useIsViewingToday, useHasHydrated } from "@/stores"
import { useCalendarEvents, useCreateEvent, useFamilyMembers, useSetupComplete } from "@/api"

// UI state from Zustand
const currentDate = useCalendarStore((state) => state.currentDate)
const goToNext = useCalendarStore((state) => state.goToNext)
const isViewingToday = useIsViewingToday()
const hasHydrated = useHasHydrated()  // Gate rendering

// Server state from TanStack Query (calendar)
const { data, isLoading } = useCalendarEvents({ startDate, endDate })
const createEvent = useCreateEvent({ onSuccess: () => console.log("Created!") })

// Server state from TanStack Query (family)
const members = useFamilyMembers()  // Derived selector from useFamily()
const setupComplete = useSetupComplete()  // Check if onboarding done
```

### API Layer

The API layer follows a service-based architecture with TanStack Query for data fetching.

**Query Keys Factories:**
```typescript
// Calendar
calendarKeys.all          // ["calendar"]
calendarKeys.events()     // ["calendar", "events"]
calendarKeys.eventList(params) // ["calendar", "events", { startDate, endDate }]
calendarKeys.event(id)    // ["calendar", "events", "event-123"]

// Family
familyKeys.all            // ["family"]
familyKeys.family()       // ["family", "data"]
```

**Calendar Hooks:**
- `useCalendarEvents(params?)` - Fetch events with optional date range/member filters
- `useCalendarEvent(id)` - Fetch single event by ID
- `useCreateEvent(callbacks?)` - Create event mutation with cache invalidation
- `useUpdateEvent(callbacks?)` - Update event with optimistic updates
- `useDeleteEvent(callbacks?)` - Delete event with optimistic removal

**Family Hooks:**
- `useFamily()` - Main query with localStorage seeding
- `useFamilyData()`, `useFamilyMembers()`, `useFamilyName()` - Derived selectors
- `useSetupComplete()`, `useFamilyLoading()` - Status selectors
- `useFamilyMemberById(id)`, `useFamilyMemberMap()` - Member lookups
- `useUnusedColors()` - Available colors for new members
- `useCreateFamily(callbacks?)` - Create family (onboarding)
- `useUpdateFamily(callbacks?)` - Update family name
- `useAddMember(callbacks?)`, `useUpdateMember(callbacks?)`, `useRemoveMember(callbacks?)` - Member CRUD
- `useDeleteFamily(callbacks?)` - Reset family

**Mock API:**
In development, the API uses mock handlers (`src/api/mocks/`) with simulated network delays. Toggle via `USE_MOCK_API` constant. Family mock persists to localStorage; calendar mock generates sample events.

### Styling

**Tailwind CSS v4** with PostCSS. Colors defined as CSS variables in `src/index.css` using oklch color space.

Family member colors: `bg-coral`, `bg-teal`, `bg-green`, `bg-purple`, `bg-yellow`, `bg-pink`, `bg-orange`

The `colorMap` in `src/lib/types/family.ts` provides bg/text/light variants for each family color.

### Component Patterns

Use CVA (class-variance-authority) for components with variants:

```typescript
const variants = cva("base-classes", {
  variants: { variant: {...}, size: {...} },
  defaultVariants: { variant: "default", size: "default" }
})
```

Always use `cn()` for className merging. Import alias: `@/` maps to `src/`.

### Performance

**React Compiler** is enabled via `babel-plugin-react-compiler` for automatic memoization.

**Optimizations applied:**
- O(1) member lookups via `useFamilyMemberMap()` (memoized in `@/api`)
- Pre-computed events by date using single-pass `useMemo` in calendar views
- Compound Zustand selectors with shallow comparison to reduce re-renders
- Family data seeded from localStorage for instant startup (no loading flash)
- Derived selectors share single `useFamily()` query (no duplicate requests)

See `docs/PERFORMANCE-BASELINE.md` for benchmark details.

### Date/Time Handling

**IMPORTANT:** All date/time operations must use centralized utilities from `src/lib/time-utils.ts` to avoid timezone bugs.

**Common Pitfalls (DO NOT USE):**
```typescript
// ❌ WRONG: new Date() parses date strings as UTC midnight
new Date("2025-12-23") // → Dec 22 at 4pm in PST!

// ❌ WRONG: toISOString() converts to UTC, shifting dates
date.toISOString() // → Wrong date for users west of UTC
```

**Correct Utilities:**
```typescript
import { parseLocalDate, formatLocalDate, format24hTo12h, format12hTo24h } from "@/lib/time-utils"

// ✅ Parse date string to local Date at midnight
parseLocalDate("2025-12-23") // → Dec 23 at 00:00 local time

// ✅ Format Date to yyyy-MM-dd in local timezone
formatLocalDate(new Date()) // → "2025-12-23"

// ✅ Convert time formats
format24hTo12h("16:00") // → "4:00 PM"
format12hTo24h("4:00 PM") // → "16:00"
```

**Available Utilities in `time-utils.ts`:**
- `parseTime(timeStr)` - Parse "4:00 PM" → `{ hours: 16, minutes: 0 }`
- `getTimeInMinutes(timeStr)` - Convert time to minutes since midnight
- `compareEventsByTime(a, b)` - Comparator for sorting events
- `format24hTo12h(time)` - Convert "16:00" → "4:00 PM" (for API)
- `format12hTo24h(time)` - Convert "4:00 PM" → "16:00" (for forms)
- `formatLocalDate(date)` - Date → "yyyy-MM-dd" (local timezone)
- `parseLocalDate(dateStr)` - "yyyy-MM-dd" → Date at local midnight

### CI/CD

GitHub Actions runs lint, tests, E2E tests, and build on all PRs (`.github/workflows/ci.yml`).

### Testing

**Stack:** Vitest + Testing Library for unit/integration tests, Playwright for E2E tests.

**Test files location:**
- Unit/integration tests: `src/**/*.test.tsx` (co-located with components)
- E2E tests: `e2e/` directory
- Test utilities: `src/test/`
- MSW mock handlers: `src/test/mocks/`

**Custom render helper:**
```typescript
import { render, renderWithUser, screen } from "@/test/test-utils"

// Basic render - wraps component with QueryClientProvider
render(<MyComponent />)

// With user events pre-configured
const { user } = renderWithUser(<MyButton />)
await user.click(screen.getByRole("button"))
```

**Test patterns:**
```typescript
import { render, screen } from "@/test/test-utils"

describe("Component", () => {
  it("renders correctly", () => {
    render(<Component />)
    expect(screen.getByText("Hello")).toBeInTheDocument()
  })
})
```

**API mocking with MSW:**
```typescript
import { server } from "@/test/mocks/server"
import { http, HttpResponse } from "msw"

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

it("handles API response", async () => {
  server.use(
    http.get("/api/events", () => HttpResponse.json({ events: [] }))
  )
  // test code...
})
```

**Coverage thresholds:** Pending - will be enabled at 70% statements, 60% branches once more tests exist.

**E2E test patterns:**
```typescript
import {
  clearStorage,
  seedAuth,
  seedFamily,
  waitForCalendar,
  waitForHydration,
  waitForDialogOpen,
  waitForDialogClosed,
  createTestMember
} from "./helpers/test-helpers"

test.beforeEach(async ({ page }) => {
  await page.goto("/")
  await clearStorage(page)
  await seedAuth(page)  // Bypass login screen
  await seedFamily(page, {
    name: "Test Family",
    members: [createTestMember("Alice", "coral")]
  })
  await page.reload()
  await waitForHydration(page)
  await waitForCalendar(page)
})

// Use semantic selectors (no data-testid)
await page.getByRole("button", { name: "Add event" }).click()
await waitForDialogOpen(page)  // Wait for Radix dialog animation
await page.getByLabel("Event Name").fill("Meeting")

// Scope selectors to avoid strict mode violations
const dialog = page.getByRole("dialog")
await expect(dialog.getByText("Alice")).toBeVisible()

// Close dialog and wait for animation
await page.keyboard.press("Escape")
await waitForDialogClosed(page)

// Event cards: use getByRole("button") + force:true for reliable clicks
// (avoids false-positive interception from CSS overflow-hidden wrappers)
const eventCard = page.getByRole("button", { name: /Team Meeting/ }).first()
await eventCard.waitFor({ state: "visible" })
await eventCard.click({ force: true })
```

**Playwright browsers:** Full matrix (Chromium, Firefox, WebKit, Mobile Chrome) on all CI builds. Uses `reducedMotion: "reduce"` in CI for animation stability.

**Store and Query testing:**
```typescript
import { seedCalendarStore, seedAppStore, resetAllStores } from "@/test/test-utils"
import { familyKeys } from "@/api"

describe("ComponentWithStore", () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    })

    // Seed Zustand stores
    seedCalendarStore({
      currentDate: new Date("2025-01-15"),
      calendarView: "weekly",
    });

    // Seed TanStack Query cache for family data
    queryClient.setQueryData(familyKeys.family(), {
      data: { name: "Test Family", members: testMembers, setupComplete: true },
      meta: { timestamp: Date.now(), requestId: "test" }
    })
  });

  it("uses store and query data", () => {
    render(<MyComponent />, { wrapper: createWrapper(queryClient) });
    // Component has access to both Zustand and Query state
  });
});
```

**Available store seeders:**
- `seedCalendarStore({ currentDate?, calendarView?, hasUserSetView?, filter?, isAddEventModalOpen?, selectedEvent?, isDetailModalOpen?, editingEvent?, isEditModalOpen? })` - Seeds any calendar state field
- `seedAppStore({ activeModule?, isSidebarOpen? })` - Seeds app state
- `seedAuthStore({ isAuthenticated? })` - Seeds auth state (sets `_hasHydrated: true`)
- `resetCalendarStore()`, `resetAppStore()`, `resetAuthStore()`, `resetAllStores()` - Reset utilities (called globally in setup.ts afterEach)

**Family data in tests:**
Family data is now in TanStack Query, not Zustand. Seed via `queryClient.setQueryData(familyKeys.family(), { data: familyData, meta: {...} })`.

**Important:** All Zustand stores (calendar, app, family, auth) are **automatically reset** after each test by `src/test/setup.ts`. This prevents state leakage between tests. Query clients should be created fresh for each test. When adding new stores with immediate initialization (like auth-store), remember to add them to `resetAllStores()`.

**Race condition pattern:** When testing components that compute defaults from query state (e.g., forms using `useFamilyMembers()`), wait for query-dependent elements before interacting:
```typescript
it("submits form with query data", async () => {
  const { user } = renderWithUser(<EventForm onSubmit={mockOnSubmit} />);

  // Wait for query state to propagate to the component
  await screen.findByRole("button", { name: testMembers[0].name });

  // Now safe to interact with the form
  await user.type(screen.getByLabelText(/event name/i), "Test");
  await user.click(screen.getByRole("button", { name: /submit/i }));

  expect(mockOnSubmit).toHaveBeenCalled();
});
```

**Notes:**
- All Zustand stores (calendar, app, family, auth) are reset globally after each test (see `setup.ts`)
- Browser APIs are mocked globally: `matchMedia`, `ResizeObserver`, `IntersectionObserver`
- localStorage/sessionStorage are cleared before each test
- QueryClient is created fresh for each test with retry disabled
- jest-dom matchers available globally (`toBeInTheDocument`, etc.)
- `noFocusedTests` Biome rule prevents `.only`/`.skip` in commits
- E2E tests must call `seedAuth(page)` after `clearStorage(page)` to bypass the login screen

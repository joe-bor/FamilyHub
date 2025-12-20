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
```

## Architecture

FamilyHub is a family organization app built with React 19, Vite, and Tailwind CSS v4. It uses shadcn/ui patterns with Radix UI primitives.

### Core Structure

- **App.tsx** - Layout orchestrator composing AppHeader, NavigationTabs, SidebarMenu, and module views
- **src/api/** - API layer with TanStack Query hooks, services, and mock handlers
- **src/stores/** - Zustand stores for UI state management (app, calendar view preferences)
- **src/providers/** - React context providers (QueryProvider for TanStack Query)
- **src/lib/types/** - Centralized TypeScript types (`calendar.ts`, `family.ts`, `chores.ts`, `meals.ts`)
- **src/lib/utils.ts** - `cn()` utility for Tailwind class merging

### Component Organization

```
src/
├── api/                       # API layer (TanStack Query + services)
│   ├── client/                # HTTP client and error handling
│   │   ├── http-client.ts     # Fetch wrapper with interceptors
│   │   └── api-error.ts       # ApiException, ApiErrorCode
│   ├── hooks/                 # TanStack Query hooks
│   │   └── use-calendar.ts    # useCalendarEvents, useCreateEvent, etc.
│   ├── services/              # API service functions
│   │   └── calendar.service.ts # CRUD operations for calendar
│   ├── mocks/                 # Mock API handlers (dev mode)
│   │   ├── calendar.mock.ts   # Mock event data and handlers
│   │   └── delay.ts           # Simulated network delay
│   └── index.ts               # Barrel exports
│
├── providers/                 # React context providers
│   └── query-provider.tsx     # TanStack Query setup with DevTools
│
├── stores/                    # Zustand UI state management
│   ├── app-store.ts           # App-wide state (activeTab, sidebar, familyName)
│   ├── calendar-store.ts      # Calendar UI state (date, view, filters)
│   └── index.ts               # Barrel exports + selectors (useIsViewingToday)
│
├── lib/types/                 # Centralized type definitions
│   ├── calendar.ts            # CalendarEvent, API types, CalendarViewType, FilterState
│   ├── family.ts              # FamilyMember, colorMap
│   ├── chores.ts              # ChoreItem
│   ├── meals.ts               # MealPlan
│   └── index.ts               # Barrel exports
│
├── components/
│   ├── ui/                    # Base primitives (button, input, label)
│   ├── shared/                # App-wide components
│   │   ├── app-header.tsx     # Top bar (family name, date, weather, settings)
│   │   ├── navigation-tabs.tsx # Left sidebar module tabs
│   │   └── sidebar-menu.tsx   # Settings slide-out menu
│   │
│   ├── calendar/
│   │   ├── CalendarModule.tsx # Module orchestrator (wires API hooks to views)
│   │   ├── views/             # DailyCalendar, WeeklyCalendar, MonthlyCalendar, ScheduleCalendar
│   │   └── components/        # CalendarNavigation, CalendarEventCard, FamilyFilterPills, etc.
│   │
│   └── *-view.tsx             # Other module views (ChoresView, MealsView, ListsView, PhotosView)
```

Barrel exports: Import from `@/api`, `@/components/calendar`, `@/components/shared`, `@/stores`, or `@/lib/types`.

### State Management

Uses a hybrid approach: **TanStack Query** for server state (API data) and **Zustand** for UI state.

**TanStack Query (Server State):**
- Calendar events fetched via `useCalendarEvents` hook
- Automatic caching, background refetching, and stale-while-revalidate
- Optimistic updates for mutations (`useCreateEvent`, `useUpdateEvent`, `useDeleteEvent`)

**Zustand (UI State):**

**app-store.ts:**
- `activeTab` - Current module (calendar, chores, meals, lists, photos)
- `isSidebarOpen` / `openSidebar` / `closeSidebar` - Sidebar state
- `familyName` - Display name for family

**calendar-store.ts:**
- `currentDate`, `calendarView`, `filter` - Calendar UI preferences
- `goToPrevious`, `goToNext`, `goToToday` - View-aware navigation actions
- `useIsViewingToday` - Computed selector for "Today" button state

**Usage pattern:**
```typescript
import { useCalendarStore, useIsViewingToday } from "@/stores"
import { useCalendarEvents, useCreateEvent } from "@/api"

// UI state from Zustand
const currentDate = useCalendarStore((state) => state.currentDate)
const goToNext = useCalendarStore((state) => state.goToNext)
const isViewingToday = useIsViewingToday()

// Server state from TanStack Query
const { data, isLoading } = useCalendarEvents({ startDate, endDate })
const createEvent = useCreateEvent({ onSuccess: () => console.log("Created!") })
```

### API Layer

The API layer follows a service-based architecture with TanStack Query for data fetching.

**Query Keys Factory** (`calendarKeys`):
```typescript
calendarKeys.all          // ["calendar"]
calendarKeys.events()     // ["calendar", "events"]
calendarKeys.eventList(params) // ["calendar", "events", { startDate, endDate }]
calendarKeys.event(id)    // ["calendar", "events", "event-123"]
```

**Available Hooks:**
- `useCalendarEvents(params?)` - Fetch events with optional date range/member filters
- `useCalendarEvent(id)` - Fetch single event by ID
- `useCreateEvent(callbacks?)` - Create event mutation with cache invalidation
- `useUpdateEvent(callbacks?)` - Update event with optimistic updates
- `useDeleteEvent(callbacks?)` - Delete event with optimistic removal

**Mock API:**
In development, the API uses mock handlers (`src/api/mocks/`) with simulated network delays. Toggle via `USE_MOCK_API` constant.

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

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server at localhost:5173
npm run build    # Type-check with tsc then build with Vite
npm run lint     # Run ESLint
npm run preview  # Preview production build
```

## Architecture

FamilyHub is a family organization app built with React 19, Vite, and Tailwind CSS v4. It uses shadcn/ui patterns with Radix UI primitives.

### Core Structure

- **App.tsx** - Layout orchestrator composing AppHeader, NavigationTabs, SidebarMenu, and module views
- **src/stores/** - Zustand stores for global state management (app, calendar, chores, meals, lists, photos)
- **src/lib/types/** - Centralized TypeScript types (`calendar.ts`, `family.ts`, `chores.ts`, `meals.ts`)
- **src/lib/calendar-data.ts** - Sample data generators for events, chores, meals
- **src/lib/utils.ts** - `cn()` utility for Tailwind class merging

### Component Organization

```
src/
├── stores/                    # Zustand state management
│   ├── app-store.ts           # App-wide state (activeTab, sidebar, familyName)
│   ├── calendar-store.ts      # Calendar state (date, view, events, filters)
│   └── index.ts               # Barrel exports + selectors (useIsViewingToday)
│
├── lib/types/                 # Centralized type definitions
│   ├── calendar.ts            # CalendarEvent, CalendarViewType, FilterState
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
│   │   ├── CalendarModule.tsx # Module orchestrator (wires stores to views)
│   │   ├── views/             # DailyCalendar, WeeklyCalendar, MonthlyCalendar, ScheduleCalendar
│   │   └── components/        # CalendarNavigation, CalendarEventCard, FamilyFilterPills, etc.
│   │
│   └── *-view.tsx             # Other module views (ChoresView, MealsView, ListsView, PhotosView)
```

Barrel exports: Import from `@/components/calendar`, `@/components/shared`, `@/stores`, or `@/lib/types`.

### State Management

Uses **Zustand** for global state with domain-specific stores:

**app-store.ts:**
- `activeTab` - Current module (calendar, chores, meals, lists, photos)
- `isSidebarOpen` / `openSidebar` / `closeSidebar` - Sidebar state
- `familyName` - Display name for family

**calendar-store.ts:**
- `currentDate`, `calendarView`, `events`, `filter` - Calendar state
- `goToPrevious`, `goToNext`, `goToToday` - View-aware navigation actions
- `addEvent`, `updateEvent`, `deleteEvent` - Event CRUD
- `useIsViewingToday` - Computed selector for "Today" button state

**Usage pattern:**
```typescript
import { useCalendarStore, useIsViewingToday } from "@/stores"

const currentDate = useCalendarStore((state) => state.currentDate)
const goToNext = useCalendarStore((state) => state.goToNext)
const isViewingToday = useIsViewingToday()
```

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

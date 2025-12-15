# FamilyHub Frontend Specification

**Version:** 1.0
**Last Updated:** December 14, 2025
**Status:** Living Document - Phase 1B In Progress

---

## Table of Contents

1. [Overview & Architecture](#1-overview--architecture)
2. [Design System](#2-design-system)
3. [Component Architecture](#3-component-architecture)
4. [State Management](#4-state-management)
5. [Data Models & Types](#5-data-models--types)
6. [API Integration Layer](#6-api-integration-layer)
7. [Routing & Navigation](#7-routing--navigation)
8. [Forms & Validation](#8-forms--validation)
9. [Real-Time Sync Architecture](#9-real-time-sync-architecture)
10. [PWA Configuration](#10-pwa-configuration)
11. [Responsive Design Guidelines](#11-responsive-design-guidelines)
12. [Testing Strategy](#12-testing-strategy)
13. [Code Examples](#13-code-examples)
14. [Performance Optimization](#14-performance-optimization)
15. [Build & Deployment](#15-build--deployment)
16. [Accessibility](#16-accessibility)
17. [Error Handling](#17-error-handling)
18. [Migration Checklist](#18-migration-checklist)

---

## 1. Overview & Architecture

### 1.1 Purpose & Scope

FamilyHub is a **modular family dashboard** Progressive Web Application (PWA) designed for:
- Touch-optimized interfaces (20"+ touchscreen displays + mobile devices)
- Family scheduling and organization
- Calendar as MVP module, with Lists/Chores/Meals/Photos modules in Phase 3
- Single-family use (no multi-tenancy for MVP)

**Key Characteristics:**
- Single-page application (SPA)
- Installable PWA (works offline)
- Real-time sync across devices (Phase 2)
- Child-friendly UI (4-year-old accessible)
- Warm, inviting design aesthetic

### 1.2 Tech Stack Summary

**Core Framework:**
- **React 18.x** with TypeScript
- **Vite 7.x** build system (replacing Next.js)
- **Path aliases:** `@/` → `src/`

**UI & Styling:**
- **Tailwind CSS v4** (PostCSS-only, no CLI)
- **shadcn/ui** component library (Radix UI primitives)
- **Lucide React** for icons
- **OKLch color space** for perceptually uniform colors
- **Nunito** typography from Google Fonts

**Forms & Validation:**
- **React Hook Form** for form state management
- **Zod** for schema validation

**Date & Time:**
- **date-fns** for date manipulation and formatting

**State Management:**
- **Phase 1A (Current):** React `useState` + `useReducer` (local state)
- **Phase 1B (Next):** Zustand or React Context for global state

**Utilities:**
- **clsx** + **tailwind-merge** for className composition (`cn()` utility)

### 1.3 Repository Structure

```
/Users/joe.bor/code/family-hub/
├── src/
│   ├── components/
│   │   ├── ui/                          # Primitive components (shadcn/ui)
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   └── label.tsx
│   │   │
│   │   ├── shared/                      # Cross-module shared components
│   │   │   ├── calendar-header.tsx      # Top navigation bar
│   │   │   ├── navigation-tabs.tsx      # Left sidebar (5 modules)
│   │   │   ├── sidebar-menu.tsx         # Settings/profile menu
│   │   │   ├── theme-provider.tsx       # Dark mode context
│   │   │   └── index.ts                 # Barrel exports
│   │   │
│   │   ├── calendar/                    # Calendar module (MVP)
│   │   │   ├── views/                   # Calendar view components
│   │   │   │   ├── daily-calendar.tsx
│   │   │   │   ├── weekly-calendar.tsx
│   │   │   │   ├── monthly-calendar.tsx
│   │   │   │   ├── schedule-calendar.tsx
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── components/              # Calendar-specific components
│   │   │   │   ├── calendar-event.tsx
│   │   │   │   ├── current-time-indicator.tsx
│   │   │   │   ├── calendar-view-switcher.tsx
│   │   │   │   ├── add-event-button.tsx
│   │   │   │   ├── add-event-modal.tsx
│   │   │   │   ├── today-button.tsx
│   │   │   │   ├── family-filter-pills.tsx
│   │   │   │   ├── calendar-filter.tsx
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   └── index.ts                 # Main barrel (re-exports all)
│   │   │
│   │   ├── chores/                      # Chores module (Phase 3)
│   │   │   └── chores-view.tsx
│   │   │
│   │   ├── meals/                       # Meals module (Phase 3)
│   │   │   └── meals-view.tsx
│   │   │
│   │   ├── lists/                       # Lists module (Phase 3)
│   │   │   └── lists-view.tsx
│   │   │
│   │   └── photos/                      # Photos module (Phase 3)
│   │       └── photos-view.tsx
│   │
│   ├── lib/
│   │   ├── calendar-data.ts             # Data models, mock data, types
│   │   └── utils.ts                     # Utility functions (cn)
│   │
│   ├── App.tsx                          # Main application component
│   ├── main.tsx                         # Application entry point
│   └── index.css                        # Global styles (Tailwind imports)
│
├── public/
│   ├── vite.svg                         # Vite logo
│   └── manifest.json                    # PWA manifest (Phase 1B)
│
├── docs/
│   ├── frontend-spec.md                 # This document
│   ├── family-calendar-prd.md           # Product requirements
│   └── PRD-REVISIONS.md                 # (Archived)
│
├── index.html                           # HTML entry (Google Fonts CDN)
├── vite.config.ts                       # Vite configuration
├── tsconfig.app.json                    # TypeScript config
├── postcss.config.js                    # PostCSS config (Tailwind v4)
├── package.json                         # Dependencies
└── README.md                            # Project overview
```

**Key Directories:**
- **`/components/ui/`**: Reusable UI primitives (button, input, label from shadcn/ui)
- **`/components/shared/`**: Components used across multiple modules
- **`/components/calendar/`**: Calendar module (MVP) - fully organized
- **`/components/[module]/`**: Future modules (Chores, Meals, Lists, Photos)
- **`/lib/`**: Utilities, types, data models

---

## 2. Design System

### 2.1 Color Palette (OKLch Color Space)

FamilyHub uses the **OKLch color space** for perceptually uniform colors that maintain consistent brightness across different hues.

#### Base UI Colors

```css
/* CSS Variables (defined in index.css) */
--background: oklch(0.98 0.01 85);       /* Warm cream: #f9f7f4 */
--foreground: oklch(0.25 0.02 250);      /* Dark text: #3c3a3f */
--card: oklch(1 0 0);                    /* White: #ffffff */
--primary: oklch(0.55 0.18 285);         /* Purple accent: #7c4dff */
--muted: oklch(0.94 0.02 85);            /* Subtle bg: #eeebe6 */
--border: oklch(0.88 0.02 85);           /* Light borders: #dcd9d0 */
```

**Usage in Tailwind:**
```tsx
<div className="bg-background text-foreground">
  <div className="bg-card border border-border">
    <button className="bg-primary text-primary-foreground">
      Click me
    </button>
  </div>
</div>
```

#### Family Member Profile Colors

Each of the 6 family member profiles has a unique color:

| Profile   | OKLch Value                | Hex Approx | CSS Variable      |
|-----------|----------------------------|------------|-------------------|
| Mom       | `oklch(0.72 0.15 25)`      | `#e88470`  | `--color-coral`   |
| Dad       | `oklch(0.65 0.12 195)`     | `#5cb8b2`  | `--color-teal`    |
| Ethan     | `oklch(0.7 0.14 145)`      | `#7bc67b`  | `--color-green`   |
| Grandma   | `oklch(0.75 0.12 350)`     | `#e896b8`  | `--color-pink`    |
| Grandpa   | `oklch(0.6 0.18 285)`      | `#9b7bcf`  | `--color-purple`  |
| Family    | `oklch(0.85 0.15 90)`      | `#f5c842`  | `--color-yellow`  |

**Color Map Implementation:**
```typescript
// src/lib/calendar-data.ts
export const colorMap: Record<string, { bg: string; text: string; light: string }> = {
  "bg-coral": {
    bg: "bg-[#e88470]",      // Full saturation background
    text: "text-[#8b3d32]",  // Darker text for contrast
    light: "bg-[#fbe9e6]",   // Light background variant
  },
  "bg-teal": {
    bg: "bg-[#5cb8b2]",
    text: "text-[#2d6360]",
    light: "bg-[#e0f4f3]",
  },
  "bg-green": {
    bg: "bg-[#7bc67b]",
    text: "text-[#3d6e3c]",
    light: "bg-[#e8f5e8]",
  },
  "bg-pink": {
    bg: "bg-[#e896b8]",
    text: "text-[#8b4869]",
    light: "bg-[#fbeef4]",
  },
  "bg-purple": {
    bg: "bg-[#9b7bcf]",
    text: "text-[#4a3a68]",
    light: "bg-[#f0ebf8]",
  },
  "bg-yellow": {
    bg: "bg-[#f5c842]",
    text: "text-[#8b6e1f]",
    light: "bg-[#fef9e6]",
  },
}
```

**Usage:**
```tsx
const member = familyMembers.find(m => m.id === event.memberId)
const colors = colorMap[member.color]

<div className={cn("p-4 rounded-lg", colors.light)}>
  <div className={cn("w-2 h-full rounded-full", colors.bg)} />
  <h3 className={cn("font-semibold", colors.text)}>
    {event.title}
  </h3>
</div>
```

### 2.2 Typography

#### Font Family

**Primary:** Nunito (Google Fonts)
- **Source:** Loaded via Google Fonts CDN in `index.html`
- **Weights:** 400 (Regular), 500 (Medium), 600 (Semibold), 700 (Bold), 800 (ExtraBold)
- **Fallback:** system sans-serif
- **Rationale:** Friendly, rounded aesthetic that appeals to children while remaining professional for adults

**Font Loading (index.html):**
```html
<!-- Preconnect for performance -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>

<!-- Font stylesheet -->
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&display=swap" rel="stylesheet">
```

**CSS Configuration (index.css):**
```css
body {
  font-family: 'Nunito', system-ui, -apple-system, sans-serif;
}
```

#### Typography Scale

Tailwind's default typography scale is used:

| Class         | Size (rem) | Size (px) | Use Case                  |
|---------------|------------|-----------|---------------------------|
| `text-xs`     | 0.75rem    | 12px      | Captions, timestamps      |
| `text-sm`     | 0.875rem   | 14px      | Secondary text, labels    |
| `text-base`   | 1rem       | 16px      | Body text (minimum)       |
| `text-lg`     | 1.125rem   | 18px      | Emphasized body text      |
| `text-xl`     | 1.25rem    | 20px      | Subheadings               |
| `text-2xl`    | 1.5rem     | 24px      | Headings                  |
| `text-3xl`    | 1.875rem   | 30px      | Large headings            |
| `text-4xl`    | 2.25rem    | 36px      | Display text              |

**Font Weight Classes:**
```css
font-normal     /* 400 - Regular */
font-medium     /* 500 - Medium */
font-semibold   /* 600 - Semibold */
font-bold       /* 700 - Bold */
font-extrabold  /* 800 - ExtraBold */
```

**Usage Guidelines:**
- **Minimum body text:** 16px (`text-base`)
- **Headings:** `text-2xl` to `text-4xl` with `font-bold` or `font-extrabold`
- **Event titles:** `text-sm` to `text-base` with `font-semibold`
- **Timestamps:** `text-xs` to `text-sm` with `font-normal`

### 2.3 Spacing & Sizing

#### Touch Target Sizes

All interactive elements follow accessibility guidelines:

- **Minimum:** 44px × 44px (iOS Human Interface Guidelines)
- **Child-friendly:** 60px × 60px (for elements targeted at young children)
- **Adjacent spacing:** 8px minimum between interactive elements

**Button Size Variants:**
```typescript
// From ui/button.tsx
const buttonVariants = cva({
  variants: {
    size: {
      default: "h-11 px-8",           // 44px height
      sm: "h-9 px-4",                 // 36px height
      lg: "h-12 px-8",                // 48px height
      icon: "h-11 w-11",              // 44px square
      "icon-sm": "h-9 w-9",           // 36px square
      "icon-lg": "h-12 w-12",         // 48px square
    }
  }
})
```

#### Border Radius

```css
/* CSS Variables (defined in index.css) */
--radius: 0.75rem;  /* 12px - Default radius */
```

**Radius Variants:**
```css
rounded-sm   /* calc(var(--radius) - 4px) = 8px */
rounded-md   /* calc(var(--radius) - 2px) = 10px */
rounded-lg   /* var(--radius) = 12px */
rounded-xl   /* calc(var(--radius) + 4px) = 16px */
rounded-2xl  /* 16px (Tailwind default) */
rounded-full /* 9999px (perfect circle) */
```

**Usage:**
- **Cards:** `rounded-xl` (16px)
- **Buttons:** `rounded-lg` (12px)
- **Inputs:** `rounded-md` (10px)
- **Event blocks:** `rounded-xl` (16px)
- **Profile indicators:** `rounded-full` (circles)

#### Spacing Scale

Tailwind's default spacing scale is used (based on 4px increments):

```css
gap-2  /* 0.5rem = 8px - Minimum between interactive elements */
gap-3  /* 0.75rem = 12px */
gap-4  /* 1rem = 16px - Standard gap */
gap-6  /* 1.5rem = 24px */
gap-8  /* 2rem = 32px */

p-2    /* 0.5rem = 8px */
p-3    /* 0.75rem = 12px */
p-4    /* 1rem = 16px - Standard padding */
p-6    /* 1.5rem = 24px */
p-8    /* 2rem = 32px */
```

---

## 3. Component Architecture

### 3.1 Component Categories

FamilyHub components are organized into three categories:

#### 1. UI Primitives (`/components/ui/`)

**Purpose:** Base-level styled components used across the entire application.

**Characteristics:**
- No business logic
- Pure presentation components
- Highly reusable
- Built on Radix UI primitives
- From shadcn/ui component library

**Components:**
- `button.tsx` - Button component with variants (default, destructive, outline, ghost, link)
- `input.tsx` - Text input with file upload support
- `label.tsx` - Form label (accessible, peer-disabled states)

**Import Pattern:**
```typescript
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
```

#### 2. Shared Components (`/components/shared/`)

**Purpose:** Components used across multiple modules or at the application level.

**Characteristics:**
- Cross-module functionality
- App-level navigation and layout
- Theme and context providers
- No module-specific business logic

**Components:**
- `navigation-tabs.tsx` - Left sidebar navigation (5 modules)
- `sidebar-menu.tsx` - Settings/profile menu
- `calendar-header.tsx` - Top navigation bar (date, weather, family info)
- `theme-provider.tsx` - Dark mode context provider

**Import Pattern:**
```typescript
import { CalendarHeader, NavigationTabs, SidebarMenu } from "@/components/shared"
```

#### 3. Module Components (`/components/calendar/`, etc.)

**Purpose:** Module-specific components organized by feature.

**Structure for Calendar Module:**
```
/components/calendar/
├── views/                    # View implementations (Day, Week, Month, Schedule)
├── components/               # Supporting components (event cards, filters, modals)
└── index.ts                  # Barrel export (re-exports all)
```

**Import Pattern:**
```typescript
import {
  WeeklyCalendar,
  DailyCalendar,
  AddEventModal,
  CalendarEventCard
} from "@/components/calendar"
```

### 3.2 Naming Conventions

**Files:**
- **Components:** PascalCase (e.g., `WeeklyCalendar.tsx`, `AddEventButton.tsx`)
- **Utilities:** camelCase (e.g., `formatDate.ts`, `parseTime.ts`)
- **Styles:** kebab-case (e.g., `index.css`, `calendar-styles.css`)

**Components:**
- **Descriptive, action-oriented:** `AddEventButton` not `Button1`
- **View components:** `[Entity]View` (e.g., `ChoresView`, `MealsView`)
- **Modal components:** `[Action][Entity]Modal` (e.g., `AddEventModal`, `EditTaskModal`)

**Variables & Functions:**
- **camelCase for local variables:** `currentDate`, `eventList`, `handleClick`
- **PascalCase for types/interfaces:** `CalendarEvent`, `FamilyMember`, `FilterState`
- **Constants:** SCREAMING_SNAKE_CASE (e.g., `MAX_EVENT_LENGTH`, `API_BASE_URL`)

### 3.3 Import/Export Patterns

#### Barrel Exports (index.ts)

**Purpose:** Simplify imports by re-exporting all components from a directory.

**Example: `/components/calendar/views/index.ts`**
```typescript
export { DailyCalendar } from "./daily-calendar"
export { WeeklyCalendar } from "./weekly-calendar"
export { MonthlyCalendar } from "./monthly-calendar"
export { ScheduleCalendar } from "./schedule-calendar"
```

**Example: `/components/calendar/components/index.ts`**
```typescript
export { CalendarEventCard } from "./calendar-event"
export { CurrentTimeIndicator } from "./current-time-indicator"
export { CalendarViewSwitcher, type CalendarViewType } from "./calendar-view-switcher"
export { AddEventButton } from "./add-event-button"
export { AddEventModal } from "./add-event-modal"
export { TodayButton } from "./today-button"
export { FamilyFilterPills } from "./family-filter-pills"
export { CalendarFilter, type FilterState } from "./calendar-filter"
```

**Example: `/components/calendar/index.ts` (Main barrel)**
```typescript
// Re-export all views
export * from "./views"

// Re-export all components
export * from "./components"
```

#### Path Aliases

Configured in `vite.config.ts` and `tsconfig.app.json`:

```typescript
// vite.config.ts
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
```

```json
// tsconfig.app.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

**Usage:**
```typescript
// Absolute imports (preferred)
import { CalendarEvent } from "@/lib/calendar-data"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { WeeklyCalendar } from "@/components/calendar"

// Relative imports (use for co-located files)
import { EventCard } from "./event-card"
import type { FilterState } from "../calendar-filter"
```

### 3.4 Component Template

**Standard Component Structure:**

```typescript
// src/components/calendar/views/weekly-calendar.tsx
import { type CalendarEvent } from "@/lib/calendar-data"
import { cn } from "@/lib/utils"
import { CalendarEventCard, CurrentTimeIndicator } from "../components"

interface WeeklyCalendarProps {
  events: CalendarEvent[]
  currentDate: Date
  onEventClick?: (event: CalendarEvent) => void
  filter: FilterState
}

export function WeeklyCalendar({
  events,
  currentDate,
  onEventClick,
  filter
}: WeeklyCalendarProps) {
  // Hooks
  const [isLoading, setIsLoading] = useState(false)

  // Computed values
  const filteredEvents = useMemo(() => {
    return events.filter(event =>
      filter.selectedMembers.includes(event.memberId)
    )
  }, [events, filter.selectedMembers])

  // Event handlers
  const handleEventClick = (event: CalendarEvent) => {
    onEventClick?.(event)
  }

  // Render
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Component JSX */}
    </div>
  )
}
```

**Key Patterns:**
1. **Type imports** with `type` keyword for types-only imports
2. **Props interface** named `[ComponentName]Props`
3. **Named export** (not default export)
4. **Hooks before computed values** before event handlers
5. **Descriptive prop names** with optional chaining for callbacks (`onEventClick?.(event)`)

---

## 4. State Management

### 4.1 Current Approach (Phase 1A)

**Local Component State:**

Uses React's built-in `useState` and `useReducer` hooks for component-level state.

**Example from App.tsx:**
```typescript
export default function FamilyHub() {
  // Calendar state
  const [currentDate, setCurrentDate] = useState(new Date())
  const [activeTab, setActiveTab] = useState<TabType>("calendar")
  const [calendarView, setCalendarView] = useState<CalendarViewType>("weekly")

  // Events state (mock data for Phase 1A)
  const [events, setEvents] = useState<CalendarEvent[]>(() => generateSampleEvents())

  // Filter state
  const [filter, setFilter] = useState<FilterState>({
    selectedMembers: familyMembers.map(m => m.id),
    showAllDayEvents: true,
  })

  // Modal state
  const [isEventModalOpen, setIsEventModalOpen] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  // ... event handlers
}
```

**Characteristics:**
- **Simple:** No external state management library
- **Local:** State lives in parent component (`App.tsx`)
- **Props drilling:** State passed down to children via props
- **Sufficient for MVP:** Works well for single-page calendar app

### 4.2 Phase 1B Migration (Zustand)

**Why Zustand?**
- Lightweight (1-2KB gzipped)
- Simple API (no boilerplate)
- No providers needed
- TypeScript-first
- DevTools support

**Store Structure:**

```typescript
// src/lib/store/calendar-store.ts
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { CalendarEvent, FilterState, FamilyMember } from '@/lib/types'

interface CalendarState {
  // State
  currentDate: Date
  events: CalendarEvent[]
  filter: FilterState
  isLoading: boolean
  error: string | null

  // Actions
  setCurrentDate: (date: Date) => void
  setFilter: (filter: FilterState) => void

  // Event operations
  addEvent: (event: CalendarEvent) => void
  updateEvent: (id: string, updates: Partial<CalendarEvent>) => void
  deleteEvent: (id: string) => void

  // Async operations (Phase 2)
  fetchEvents: (start: Date, end: Date) => Promise<void>
}

export const useCalendarStore = create<CalendarState>()(
  devtools(
    (set, get) => ({
      // Initial state
      currentDate: new Date(),
      events: [],
      filter: {
        selectedMembers: [],
        showAllDayEvents: true,
      },
      isLoading: false,
      error: null,

      // Actions
      setCurrentDate: (date) => set({ currentDate: date }),

      setFilter: (filter) => set({ filter }),

      addEvent: (event) =>
        set((state) => ({
          events: [...state.events, event],
        })),

      updateEvent: (id, updates) =>
        set((state) => ({
          events: state.events.map((event) =>
            event.id === id ? { ...event, ...updates } : event
          ),
        })),

      deleteEvent: (id) =>
        set((state) => ({
          events: state.events.filter((event) => event.id !== id),
        })),

      fetchEvents: async (start, end) => {
        set({ isLoading: true, error: null })
        try {
          // API call (Phase 2)
          const response = await apiClient.get(`/events?start=${start}&end=${end}`)
          set({ events: response.events, isLoading: false })
        } catch (error) {
          set({ error: error.message, isLoading: false })
        }
      },
    }),
    { name: 'calendar-store' }
  )
)
```

**Usage in Components:**

```typescript
// Using the entire store
import { useCalendarStore } from '@/lib/store/calendar-store'

export function WeeklyCalendar() {
  const { events, filter, isLoading } = useCalendarStore()
  const addEvent = useCalendarStore((state) => state.addEvent)

  // Component logic
}

// Using selectors (optimized re-renders)
export function EventList() {
  const events = useCalendarStore((state) => state.events)
  const filteredEvents = useCalendarStore((state) =>
    state.events.filter((e) => state.filter.selectedMembers.includes(e.memberId))
  )

  // Component logic
}
```

### 4.3 State Persistence (LocalStorage)

**Filter State Persistence:**

```typescript
// src/lib/store/calendar-store.ts
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export const useCalendarStore = create<CalendarState>()(
  persist(
    (set, get) => ({
      // ... store implementation
    }),
    {
      name: 'calendar-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        filter: state.filter,  // Only persist filter state
      }),
    }
  )
)
```

**Usage:**
- Filter selections persist across page reloads
- Selected family members remembered
- All-day events toggle remembered

---

## 5. Data Models & Types

### 5.1 Core Types

**Location:** `src/lib/calendar-data.ts` (currently) → `src/lib/types/calendar.ts` (Phase 1B)

#### FamilyMember

```typescript
export interface FamilyMember {
  id: string
  name: string
  color: string  // e.g., "bg-coral", "bg-teal"
  avatar?: string
  googleCalendarId?: string  // Phase 2: Link to Google account
}

export const familyMembers: FamilyMember[] = [
  { id: "1", name: "Mom", color: "bg-coral" },
  { id: "2", name: "Dad", color: "bg-teal" },
  { id: "3", name: "Ethan", color: "bg-green" },
  { id: "4", name: "Grandma", color: "bg-pink" },
  { id: "5", name: "Grandpa", color: "bg-purple" },
  { id: "6", name: "Family", color: "bg-yellow" },
]
```

#### CalendarEvent

```typescript
export interface CalendarEvent {
  id: string
  title: string
  startTime: string      // "9:00 AM"
  endTime: string        // "10:00 AM"
  date: Date
  memberId: string       // Single person (current MVP)
  memberIds?: string[]   // Multi-person (Phase 2)
  isAllDay?: boolean
  location?: string
  notes?: string
  source?: "local" | "google"  // Phase 2
  googleEventId?: string       // Phase 2
}
```

**Example:**
```typescript
const event: CalendarEvent = {
  id: "evt_123",
  title: "Soccer Practice",
  startTime: "3:00 PM",
  endTime: "4:30 PM",
  date: new Date("2025-01-15"),
  memberId: "3",  // Ethan
  location: "Park Field",
  notes: "Bring water bottle",
}
```

#### FilterState

```typescript
export interface FilterState {
  selectedMembers: string[]    // Array of member IDs
  showAllDayEvents: boolean
}
```

**Example:**
```typescript
const filter: FilterState = {
  selectedMembers: ["1", "2", "3"],  // Show only Mom, Dad, Ethan
  showAllDayEvents: true,
}
```

#### CalendarViewType

```typescript
export type CalendarViewType = "daily" | "weekly" | "monthly" | "schedule"
```

#### TabType

```typescript
export type TabType = "calendar" | "lists" | "chores" | "meals" | "photos"
```

### 5.2 Supporting Types

#### ChoreItem

```typescript
export interface ChoreItem {
  id: string
  title: string
  memberId: string
  completed: boolean
  dueDate?: Date
  recurring?: "daily" | "weekly" | "monthly"
}
```

#### MealPlan

```typescript
export interface MealPlan {
  date: Date
  breakfast?: string
  lunch?: string
  dinner?: string
}
```

#### ListItem

```typescript
export interface ListItem {
  id: string
  title: string
  completed: boolean
  category?: string
}

export interface List {
  id: string
  name: string
  type: "grocery" | "todo" | "gift" | "vacation"
  items: ListItem[]
}
```

### 5.3 API Response Types (Phase 2)

**Location:** `src/lib/types/api.ts`

```typescript
export interface ApiResponse<T> {
  data: T
  success: boolean
  timestamp: string
}

export interface EventsResponse {
  events: CalendarEvent[]
  total: number
  start: string
  end: string
}

export interface ApiError {
  message: string
  code: string
  details?: Record<string, unknown>
}
```

### 5.4 Color Map Type

```typescript
export type ColorKey =
  | "bg-coral"
  | "bg-teal"
  | "bg-green"
  | "bg-pink"
  | "bg-purple"
  | "bg-yellow"

export interface ColorVariant {
  bg: string    // Full saturation: "bg-[#e88470]"
  text: string  // Dark variant: "text-[#8b3d32]"
  light: string // Light variant: "bg-[#fbe9e6]"
}

export const colorMap: Record<ColorKey, ColorVariant> = {
  // ... color definitions
}
```

---

## 6. API Integration Layer

### 6.1 API Client Setup (Phase 2)

**Location:** `src/lib/api/client.ts`

```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api"

class ApiClient {
  private baseURL: string

  constructor(baseURL: string) {
    this.baseURL = baseURL
  }

  async get<T>(path: string): Promise<T> {
    const response = await fetch(`${this.baseURL}${path}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      throw new ApiError(`HTTP ${response.status}: ${response.statusText}`)
    }

    return response.json()
  }

  async post<T>(path: string, data: unknown): Promise<T> {
    const response = await fetch(`${this.baseURL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw new ApiError(`HTTP ${response.status}: ${response.statusText}`)
    }

    return response.json()
  }

  async put<T>(path: string, data: unknown): Promise<T> {
    const response = await fetch(`${this.baseURL}${path}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw new ApiError(`HTTP ${response.status}: ${response.statusText}`)
    }

    return response.json()
  }

  async delete<T>(path: string): Promise<T> {
    const response = await fetch(`${this.baseURL}${path}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      throw new ApiError(`HTTP ${response.status}: ${response.statusText}`)
    }

    return response.json()
  }
}

export const apiClient = new ApiClient(API_BASE_URL)

class ApiError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ApiError"
  }
}
```

### 6.2 API Contract

#### Events API

**GET /api/events**
```typescript
// Request
interface GetEventsParams {
  start: string  // ISO date: "2025-01-01"
  end: string    // ISO date: "2025-01-31"
}

// Response
interface GetEventsResponse {
  events: CalendarEvent[]
  total: number
}

// Usage
const { events } = await apiClient.get<GetEventsResponse>(
  `/events?start=2025-01-01&end=2025-01-31`
)
```

**POST /api/events**
```typescript
// Request body
interface CreateEventPayload {
  title: string
  startTime: string
  endTime: string
  date: string  // ISO date
  memberId: string
  isAllDay?: boolean
  location?: string
  notes?: string
}

// Response
interface CreateEventResponse {
  event: CalendarEvent
}

// Usage
const newEvent = await apiClient.post<CreateEventResponse>('/events', {
  title: "Team Meeting",
  startTime: "10:00 AM",
  endTime: "11:00 AM",
  date: "2025-01-15",
  memberId: "1",
})
```

**PUT /api/events/:id**
```typescript
// Request body (all fields optional)
interface UpdateEventPayload extends Partial<CreateEventPayload> {}

// Response
interface UpdateEventResponse {
  event: CalendarEvent
}

// Usage
const updated = await apiClient.put<UpdateEventResponse>('/events/evt_123', {
  title: "Updated Title",
  location: "New Location",
})
```

**DELETE /api/events/:id**
```typescript
// No request body

// Response
// 204 No Content or success message

// Usage
await apiClient.delete('/events/evt_123')
```

#### Profiles API

**GET /api/profiles**
```typescript
// Response
interface GetProfilesResponse {
  profiles: FamilyMember[]
}

// Usage
const { profiles } = await apiClient.get<GetProfilesResponse>('/profiles')
```

**PUT /api/profiles/:id**
```typescript
// Request body
interface UpdateProfilePayload {
  name?: string
  color?: string
  googleCalendarId?: string
}

// Response
interface UpdateProfileResponse {
  profile: FamilyMember
}

// Usage
const updated = await apiClient.put<UpdateProfileResponse>('/profiles/1', {
  name: "Mom (Updated)",
})
```

### 6.3 WebSocket Integration (Phase 2)

**Location:** `src/lib/api/websocket.ts`

```typescript
import { useEffect, useRef } from 'react'
import { useCalendarStore } from '@/lib/store/calendar-store'

const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:8080/ws"

interface WebSocketMessage {
  type: "EVENT_CREATED" | "EVENT_UPDATED" | "EVENT_DELETED" | "TASK_UPDATED"
  payload: CalendarEvent | { id: string }
  timestamp: string
  userId?: string
}

export function useRealtimeSync() {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<number>()
  const { addEvent, updateEvent, deleteEvent } = useCalendarStore()

  useEffect(() => {
    const connect = () => {
      const ws = new WebSocket(WS_URL)

      ws.onopen = () => {
        console.log('WebSocket connected')
      }

      ws.onmessage = (event) => {
        const message: WebSocketMessage = JSON.parse(event.data)

        switch (message.type) {
          case "EVENT_CREATED":
            addEvent(message.payload as CalendarEvent)
            break

          case "EVENT_UPDATED":
            const updated = message.payload as CalendarEvent
            updateEvent(updated.id, updated)
            break

          case "EVENT_DELETED":
            const deleted = message.payload as { id: string }
            deleteEvent(deleted.id)
            break
        }
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
      }

      ws.onclose = () => {
        console.log('WebSocket disconnected, reconnecting...')
        // Exponential backoff reconnection
        reconnectTimeoutRef.current = window.setTimeout(
          connect,
          Math.min(30000, (reconnectTimeoutRef.current || 1000) * 2)
        )
      }

      wsRef.current = ws
    }

    connect()

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      wsRef.current?.close()
    }
  }, [addEvent, updateEvent, deleteEvent])
}
```

**Usage in App.tsx:**
```typescript
export default function FamilyHub() {
  // Enable real-time sync (Phase 2)
  useRealtimeSync()

  // ... rest of component
}
```

---

## 7. Routing & Navigation

### 7.1 Current Implementation (Phase 1)

**Tab-Based Navigation (No Router):**

FamilyHub currently uses a simple tab-based navigation system without a routing library.

**Implementation in App.tsx:**
```typescript
export default function FamilyHub() {
  const [activeTab, setActiveTab] = useState<TabType>("calendar")

  const renderContent = () => {
    switch (activeTab) {
      case "calendar":
        return <CalendarContent />
      case "chores":
        return <ChoresView />
      case "meals":
        return <MealsView />
      case "lists":
        return <ListsView />
      case "photos":
        return <PhotosView />
      default:
        return <CalendarContent />
    }
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <CalendarHeader {...headerProps} />
      <div className="flex-1 flex overflow-hidden">
        <NavigationTabs activeTab={activeTab} onTabChange={setActiveTab} />
        <main className="flex-1 flex flex-col overflow-hidden">
          {renderContent()}
        </main>
      </div>
    </div>
  )
}
```

**NavigationTabs Component:**
```typescript
// src/components/shared/navigation-tabs.tsx
export type TabType = "calendar" | "lists" | "chores" | "meals" | "photos"

interface NavigationTabsProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
}

export function NavigationTabs({ activeTab, onTabChange }: NavigationTabsProps) {
  const tabs: Array<{ id: TabType; label: string; icon: React.ReactNode }> = [
    { id: "calendar", label: "Calendar", icon: <CalendarIcon /> },
    { id: "lists", label: "Lists", icon: <ListTodoIcon /> },
    { id: "chores", label: "Chores", icon: <CheckSquareIcon /> },
    { id: "meals", label: "Meals", icon: <UtensilsCrossedIcon /> },
    { id: "photos", label: "Photos", icon: <ImageIcon /> },
  ]

  return (
    <nav className="w-20 bg-card border-r flex flex-col items-center py-4 gap-2">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "w-14 h-14 flex flex-col items-center justify-center rounded-lg",
            "transition-colors",
            activeTab === tab.id
              ? "bg-primary text-primary-foreground"
              : "hover:bg-muted text-muted-foreground"
          )}
        >
          {tab.icon}
          <span className="text-xs mt-1">{tab.label}</span>
        </button>
      ))}
    </nav>
  )
}
```

**Characteristics:**
- **Simple:** No routing library, just conditional rendering
- **Fast:** No route parsing or matching
- **Sufficient for MVP:** Single-page app with tab switching
- **No URL sync:** Refreshing page always shows Calendar tab

### 7.2 Future Enhancement: React Router (Phase 2)

**Why Add React Router?**
- Deep linking (share specific views: `/calendar/week`, `/chores`)
- Browser back/forward buttons work
- Bookmarkable URLs
- Better PWA navigation experience

**Implementation Example:**

```typescript
// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

export default function FamilyHub() {
  return (
    <BrowserRouter>
      <div className="h-screen flex flex-col bg-background">
        <CalendarHeader />
        <div className="flex-1 flex overflow-hidden">
          <NavigationTabs />
          <main className="flex-1 flex flex-col overflow-hidden">
            <Routes>
              <Route path="/" element={<Navigate to="/calendar" replace />} />
              <Route path="/calendar" element={<CalendarView />}>
                <Route index element={<WeeklyCalendar />} />
                <Route path="day" element={<DailyCalendar />} />
                <Route path="week" element={<WeeklyCalendar />} />
                <Route path="month" element={<MonthlyCalendar />} />
                <Route path="schedule" element={<ScheduleCalendar />} />
              </Route>
              <Route path="/chores" element={<ChoresView />} />
              <Route path="/meals" element={<MealsView />} />
              <Route path="/lists" element={<ListsView />} />
              <Route path="/photos" element={<PhotosView />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  )
}
```

**Updated NavigationTabs (with routing):**
```typescript
import { useLocation, useNavigate } from 'react-router-dom'

export function NavigationTabs() {
  const navigate = useNavigate()
  const location = useLocation()

  const activeTab = location.pathname.split('/')[1] as TabType

  const handleTabChange = (tab: TabType) => {
    navigate(`/${tab}`)
  }

  // ... rest of component
}
```

---

## 8. Forms & Validation

### 8.1 Form Pattern (React Hook Form + Zod)

FamilyHub uses **React Hook Form** for form state management and **Zod** for schema validation.

**Benefits:**
- Type-safe form validation
- Automatic TypeScript inference
- Composable validation schemas
- Excellent DX with minimal boilerplate

### 8.2 Complete Example: Add Event Modal

```typescript
// src/components/calendar/components/add-event-modal.tsx
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { familyMembers } from "@/lib/calendar-data"

// Validation schema
const eventSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(100, "Title must be less than 100 characters"),

  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),

  startTime: z
    .string()
    .regex(/^\d{1,2}:\d{2}\s?(AM|PM)$/i, "Invalid time format (e.g., 9:00 AM)"),

  endTime: z
    .string()
    .regex(/^\d{1,2}:\d{2}\s?(AM|PM)$/i, "Invalid time format (e.g., 10:00 AM)"),

  memberId: z
    .string()
    .min(1, "Please select a family member"),

  location: z
    .string()
    .max(200, "Location must be less than 200 characters")
    .optional()
    .or(z.literal("")),

  notes: z
    .string()
    .max(500, "Notes must be less than 500 characters")
    .optional()
    .or(z.literal("")),
})

// Infer TypeScript type from schema
type EventFormData = z.infer<typeof eventSchema>

interface AddEventModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (event: CalendarEvent) => void
  initialDate?: Date
}

export function AddEventModal({
  isOpen,
  onClose,
  onAdd,
  initialDate = new Date()
}: AddEventModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      date: initialDate.toISOString().split('T')[0],
      startTime: "9:00 AM",
      endTime: "10:00 AM",
      memberId: "",
      title: "",
      location: "",
      notes: "",
    },
  })

  const onSubmit = async (data: EventFormData) => {
    try {
      // Transform form data to CalendarEvent
      const newEvent: CalendarEvent = {
        id: `evt_${Date.now()}`,
        title: data.title,
        startTime: data.startTime,
        endTime: data.endTime,
        date: new Date(data.date),
        memberId: data.memberId,
        location: data.location || undefined,
        notes: data.notes || undefined,
      }

      onAdd(newEvent)
      reset()
      onClose()
    } catch (error) {
      console.error("Failed to create event:", error)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-card rounded-xl shadow-lg p-6 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">Add New Event</h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Title */}
          <div>
            <Label htmlFor="title">Event Title *</Label>
            <Input
              id="title"
              {...register("title")}
              placeholder="Team Meeting"
            />
            {errors.title && (
              <p className="text-sm text-destructive mt-1">
                {errors.title.message}
              </p>
            )}
          </div>

          {/* Date */}
          <div>
            <Label htmlFor="date">Date *</Label>
            <Input
              id="date"
              type="date"
              {...register("date")}
            />
            {errors.date && (
              <p className="text-sm text-destructive mt-1">
                {errors.date.message}
              </p>
            )}
          </div>

          {/* Time Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startTime">Start Time *</Label>
              <Input
                id="startTime"
                {...register("startTime")}
                placeholder="9:00 AM"
              />
              {errors.startTime && (
                <p className="text-sm text-destructive mt-1">
                  {errors.startTime.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="endTime">End Time *</Label>
              <Input
                id="endTime"
                {...register("endTime")}
                placeholder="10:00 AM"
              />
              {errors.endTime && (
                <p className="text-sm text-destructive mt-1">
                  {errors.endTime.message}
                </p>
              )}
            </div>
          </div>

          {/* Family Member */}
          <div>
            <Label htmlFor="memberId">Assign To *</Label>
            <select
              id="memberId"
              {...register("memberId")}
              className="w-full h-11 rounded-md border border-input bg-background px-3"
            >
              <option value="">Select a family member</option>
              {familyMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
            {errors.memberId && (
              <p className="text-sm text-destructive mt-1">
                {errors.memberId.message}
              </p>
            )}
          </div>

          {/* Location (Optional) */}
          <div>
            <Label htmlFor="location">Location (Optional)</Label>
            <Input
              id="location"
              {...register("location")}
              placeholder="Conference Room A"
            />
            {errors.location && (
              <p className="text-sm text-destructive mt-1">
                {errors.location.message}
              </p>
            )}
          </div>

          {/* Notes (Optional) */}
          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <textarea
              id="notes"
              {...register("notes")}
              placeholder="Additional details..."
              className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            {errors.notes && (
              <p className="text-sm text-destructive mt-1">
                {errors.notes.message}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Event"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

### 8.3 Validation Patterns

**Common Validation Rules:**

```typescript
// Required string with length constraint
title: z.string().min(1).max(100)

// Optional string (allow empty)
notes: z.string().optional().or(z.literal(""))

// Email validation
email: z.string().email("Invalid email address")

// URL validation
url: z.string().url("Invalid URL")

// Number with range
age: z.number().min(0).max(120)

// Date validation
date: z.date()
// OR string date
dateString: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

// Enum validation
status: z.enum(["pending", "completed", "cancelled"])

// Boolean
completed: z.boolean()

// Array of strings
tags: z.array(z.string())

// Nested object
address: z.object({
  street: z.string(),
  city: z.string(),
  zip: z.string().regex(/^\d{5}$/),
})

// Custom validation
password: z
  .string()
  .min(8)
  .regex(/[A-Z]/, "Must contain uppercase")
  .regex(/[0-9]/, "Must contain number")
```

---

## 9. Real-Time Sync Architecture

### 9.1 WebSocket Message Format

**Message Structure:**
```typescript
interface WebSocketMessage {
  type: "EVENT_CREATED" | "EVENT_UPDATED" | "EVENT_DELETED" | "TASK_UPDATED"
  payload: CalendarEvent | { id: string }
  timestamp: string  // ISO 8601
  userId?: string    // To exclude originating client from update
}
```

**Example Messages:**

```json
// Event Created
{
  "type": "EVENT_CREATED",
  "payload": {
    "id": "evt_456",
    "title": "Team Meeting",
    "startTime": "10:00 AM",
    "endTime": "11:00 AM",
    "date": "2025-01-15T00:00:00.000Z",
    "memberId": "1"
  },
  "timestamp": "2025-01-14T15:30:00.000Z",
  "userId": "user_123"
}

// Event Updated
{
  "type": "EVENT_UPDATED",
  "payload": {
    "id": "evt_456",
    "title": "Team Meeting (Updated)",
    "location": "Conference Room B"
  },
  "timestamp": "2025-01-14T15:35:00.000Z",
  "userId": "user_123"
}

// Event Deleted
{
  "type": "EVENT_DELETED",
  "payload": {
    "id": "evt_456"
  },
  "timestamp": "2025-01-14T15:40:00.000Z",
  "userId": "user_123"
}
```

### 9.2 Sync Flow

**Flow Diagram:**

```
1. User creates event in UI
   ↓
2. Optimistic update: Event appears immediately in local state
   ↓
3. POST request to /api/events
   ↓
4. Server saves to database
   ↓
5. Server broadcasts WebSocket message to all connected clients
   ↓
6. Other clients receive message and update their local state
   ↓
7. Originating client ignores message (already updated optimistically)
```

**Implementation:**

```typescript
// In Zustand store
addEvent: (event: CalendarEvent) => {
  // 1. Optimistic update
  set((state) => ({
    events: [...state.events, event],
  }))

  // 2. Send to server (async)
  apiClient.post('/events', event)
    .then((response) => {
      // 3. Update with server response (includes generated ID, etc.)
      set((state) => ({
        events: state.events.map((e) =>
          e.id === event.id ? response.event : e
        ),
      }))
    })
    .catch((error) => {
      // 4. Rollback on error
      set((state) => ({
        events: state.events.filter((e) => e.id !== event.id),
        error: error.message,
      }))
    })
}
```

### 9.3 Conflict Resolution

**Strategy: Last-Write-Wins**

If two clients edit the same event simultaneously:
1. Both clients make changes locally (optimistic update)
2. Both send updates to server
3. Server processes updates in order received
4. Server broadcasts final state to all clients
5. Clients receive update and overwrite local state

**User Notification:**
```typescript
// In WebSocket message handler
ws.onmessage = (event) => {
  const message: WebSocketMessage = JSON.parse(event.data)

  if (message.type === "EVENT_UPDATED") {
    const existingEvent = get().events.find((e) => e.id === message.payload.id)

    if (existingEvent && hasLocalChanges(existingEvent, message.payload)) {
      // Show toast notification
      toast.info("Event was updated remotely. Reloading latest version.")
    }

    updateEvent(message.payload.id, message.payload)
  }
}
```

---

## 10. PWA Configuration

### 10.1 Manifest (public/manifest.json)

```json
{
  "name": "FamilyHub - Family Calendar & Organizer",
  "short_name": "FamilyHub",
  "description": "Family calendar, chores, meals, and photo organizer",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#7c4dff",
  "background_color": "#f9f7f4",
  "orientation": "any",
  "scope": "/",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "categories": ["productivity", "lifestyle"],
  "shortcuts": [
    {
      "name": "Calendar",
      "short_name": "Calendar",
      "description": "View family calendar",
      "url": "/?tab=calendar",
      "icons": [{ "src": "/icon-calendar-96.png", "sizes": "96x96" }]
    },
    {
      "name": "Add Event",
      "short_name": "Add Event",
      "description": "Quick add calendar event",
      "url": "/?action=add-event",
      "icons": [{ "src": "/icon-add-96.png", "sizes": "96x96" }]
    }
  ]
}
```

**Link in index.html:**
```html
<link rel="manifest" href="/manifest.json">
```

### 10.2 Service Worker Strategy

**Tool:** Workbox (via Vite PWA plugin)

**Install Vite PWA Plugin:**
```bash
npm install -D vite-plugin-pwa
```

**Vite Config:**
```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png', 'icon-512.png'],
      manifest: {
        // ... manifest config (can also be in separate file)
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            // Cache API responses (network-first strategy)
            urlPattern: /^https:\/\/api\.familyhub\.com\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },
              networkTimeoutSeconds: 10,
            },
          },
          {
            // Cache Google Fonts
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
          {
            // Cache images
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
        ],
      },
    }),
  ],
})
```

**Caching Strategies:**
- **Static assets:** Cache-first (HTML, CSS, JS, fonts)
- **API calls:** Network-first with fallback (fresh data preferred)
- **Images:** Cache-first with expiration

### 10.3 Offline Functionality

**Offline Event Viewing:**

Events cached locally via service worker can be viewed offline. Creating/editing events while offline is queued and synced when online.

**Implementation:**
```typescript
// src/lib/store/calendar-store.ts
addEvent: async (event: CalendarEvent) => {
  // 1. Add to local state immediately
  set((state) => ({ events: [...state.events, event] }))

  // 2. Try to sync with server
  try {
    await apiClient.post('/events', event)
  } catch (error) {
    if (!navigator.onLine) {
      // 3. If offline, queue for later
      queueOfflineAction({ type: 'CREATE_EVENT', payload: event })
      toast.info("Event saved. Will sync when online.")
    } else {
      // 4. If online but failed, show error
      set((state) => ({
        events: state.events.filter((e) => e.id !== event.id),
        error: error.message,
      }))
      toast.error("Failed to create event. Please try again.")
    }
  }
}

// Sync queued actions when online
window.addEventListener('online', () => {
  syncOfflineQueue()
})
```

---

## 11. Responsive Design Guidelines

### 11.1 Breakpoints

FamilyHub uses Tailwind's default breakpoints with mobile-first approach:

| Breakpoint | Min Width | Max Width | Device Type               | Layout                                |
|------------|-----------|-----------|---------------------------|---------------------------------------|
| `xs`       | 0px       | 639px     | Mobile phones             | Single column, day view default       |
| `sm`       | 640px     | 767px     | Large phones, small tablets | Adjusted layout, day/week views       |
| `md`       | 768px     | 1023px    | Tablets                   | Side-by-side, week view default       |
| `lg`       | 1024px    | 1279px    | Small desktops, touchscreens | Full layout, week view                |
| `xl`       | 1280px    | 1535px    | Desktops                  | Full layout with spacing              |
| `2xl`      | 1536px+   | —         | Large desktops            | Maximum width container               |

### 11.2 Mobile-First Approach

**Pattern:**
Start with mobile styles, then add larger screen overrides:

```tsx
<div className="
  flex-col           /* Mobile: Stack vertically */
  sm:flex-row        /* Tablet+: Side by side */
  gap-2              /* Mobile: 8px gap */
  sm:gap-4           /* Tablet+: 16px gap */
  p-4                /* Mobile: 16px padding */
  md:p-6             /* Desktop+: 24px padding */
">
  <div className="
    w-full             /* Mobile: Full width */
    md:w-1/2           /* Desktop: Half width */
  ">
    {/* Content */}
  </div>
</div>
```

### 11.3 Responsive Calendar Views

**Mobile (< 768px):**
- Default to **Day View** (week view too cramped)
- Bottom navigation for calendar controls
- Swipe gestures for day navigation
- Full-screen event modals

**Tablet (768px - 1023px):**
- **Week View** as default
- Stacked calendar and task list (tabs or scroll)
- Side-by-side layout for event details

**Desktop/Touchscreen (1024px+):**
- **Week View** as default
- Full layout with sidebar navigation
- Side-by-side calendar + event details
- Larger touch targets for touchscreen

**Implementation Example:**
```typescript
// Auto-select view based on screen size
const [calendarView, setCalendarView] = useState<CalendarViewType>(() => {
  if (window.innerWidth < 768) {
    return "daily"  // Mobile: Day view
  }
  return "weekly"   // Tablet+: Week view
})

// Update on resize
useEffect(() => {
  const handleResize = () => {
    if (window.innerWidth < 768 && calendarView === "weekly") {
      setCalendarView("daily")
    }
  }

  window.addEventListener('resize', handleResize)
  return () => window.removeEventListener('resize', handleResize)
}, [calendarView])
```

### 11.4 Touch Optimization

**Touch Target Sizes:**
- All buttons: Minimum 44px × 44px
- Child-friendly elements: 60px × 60px
- Adequate spacing: 8px between elements

**Swipe Gestures:**
```typescript
// Day view: Swipe left/right to navigate days
import { useSwipeable } from 'react-swipeable'

const handlers = useSwipeable({
  onSwipedLeft: () => setCurrentDate(addDays(currentDate, 1)),
  onSwipedRight: () => setCurrentDate(subDays(currentDate, 1)),
  preventDefaultTouchmoveEvent: true,
  trackMouse: true, // Also works with mouse drag
})

<div {...handlers} className="touch-pan-y">
  {/* Calendar content */}
</div>
```

**No Hover Interactions:**
- Avoid `:hover`-only actions
- Use `:active` states for touch feedback
- Provide visible focus indicators

---

## 12. Testing Strategy

### 12.1 Unit Tests (Vitest)

**Setup:**
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

**Vitest Config:**
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

**Setup File:**
```typescript
// src/test/setup.ts
import '@testing-library/jest-dom'
```

**Example Test:**
```typescript
// src/components/calendar/__tests__/weekly-calendar.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WeeklyCalendar } from '../views/weekly-calendar'
import { generateSampleEvents } from '@/lib/calendar-data'

describe('WeeklyCalendar', () => {
  const mockEvents = generateSampleEvents()

  it('renders 7 days of the week', () => {
    render(
      <WeeklyCalendar
        events={mockEvents}
        currentDate={new Date('2025-01-15')}
      />
    )

    expect(screen.getByText('Mon')).toBeInTheDocument()
    expect(screen.getByText('Tue')).toBeInTheDocument()
    expect(screen.getByText('Wed')).toBeInTheDocument()
    expect(screen.getByText('Thu')).toBeInTheDocument()
    expect(screen.getByText('Fri')).toBeInTheDocument()
    expect(screen.getByText('Sat')).toBeInTheDocument()
    expect(screen.getByText('Sun')).toBeInTheDocument()
  })

  it('displays events in correct time slots', () => {
    const testEvent = {
      id: '1',
      title: 'Team Meeting',
      startTime: '10:00 AM',
      endTime: '11:00 AM',
      date: new Date('2025-01-15'),
      memberId: '1',
    }

    render(
      <WeeklyCalendar
        events={[testEvent]}
        currentDate={new Date('2025-01-15')}
      />
    )

    expect(screen.getByText('Team Meeting')).toBeInTheDocument()
    expect(screen.getByText('10:00 AM - 11:00 AM')).toBeInTheDocument()
  })

  it('filters events by selected members', () => {
    const filter = {
      selectedMembers: ['1'],  // Only Mom
      showAllDayEvents: true,
    }

    render(
      <WeeklyCalendar
        events={mockEvents}
        currentDate={new Date('2025-01-15')}
        filter={filter}
      />
    )

    // Only events for member '1' should be visible
    const momEvents = mockEvents.filter((e) => e.memberId === '1')
    momEvents.forEach((event) => {
      expect(screen.getByText(event.title)).toBeInTheDocument()
    })
  })
})
```

### 12.2 Component Tests (Testing Library)

**Testing User Interactions:**
```typescript
import { render, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

it('creates new event when form is submitted', async () => {
  const onAdd = vi.fn()
  const { getByLabelText, getByRole } = render(
    <AddEventModal isOpen onClose={() => {}} onAdd={onAdd} />
  )

  // Fill out form
  await userEvent.type(getByLabelText(/event title/i), 'Team Meeting')
  await userEvent.type(getByLabelText(/date/i), '2025-01-15')
  await userEvent.type(getByLabelText(/start time/i), '10:00 AM')
  await userEvent.type(getByLabelText(/end time/i), '11:00 AM')
  await userEvent.selectOptions(getByLabelText(/assign to/i), '1')

  // Submit form
  fireEvent.click(getByRole('button', { name: /add event/i }))

  // Assert
  await waitFor(() => {
    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Team Meeting',
        startTime: '10:00 AM',
        endTime: '11:00 AM',
        memberId: '1',
      })
    )
  })
})
```

### 12.3 E2E Tests (Playwright - Phase 1B)

**Setup:**
```bash
npm install -D @playwright/test
npx playwright install
```

**Example E2E Test:**
```typescript
// tests/e2e/calendar.spec.ts
import { test, expect } from '@playwright/test'

test('create and view event end-to-end', async ({ page }) => {
  // Navigate to app
  await page.goto('http://localhost:5173')

  // Click add event button
  await page.click('[data-testid="add-event-button"]')

  // Fill out event form
  await page.fill('[name="title"]', 'Team Meeting')
  await page.fill('[name="date"]', '2025-01-15')
  await page.fill('[name="startTime"]', '10:00 AM')
  await page.fill('[name="endTime"]', '11:00 AM')
  await page.selectOption('[name="memberId"]', '1')

  // Submit form
  await page.click('button[type="submit"]')

  // Verify event appears in calendar
  await expect(page.getByText('Team Meeting')).toBeVisible()
  await expect(page.getByText('10:00 AM - 11:00 AM')).toBeVisible()

  // Click event to open details
  await page.click('text=Team Meeting')

  // Verify event details modal
  await expect(page.getByRole('heading', { name: 'Team Meeting' })).toBeVisible()
})

test('filter events by family member', async ({ page }) => {
  await page.goto('http://localhost:5173')

  // Click filter button
  await page.click('[data-testid="filter-button"]')

  // Uncheck all members except Mom
  await page.click('text=Dad')
  await page.click('text=Ethan')

  // Verify only Mom's events are visible
  const momEvents = await page.locator('[data-member-id="1"]').count()
  const dadEvents = await page.locator('[data-member-id="2"]').count()

  expect(momEvents).toBeGreaterThan(0)
  expect(dadEvents).toBe(0)
})
```

---

## 13. Code Examples

### 13.1 Complete CalendarEventCard Component

```typescript
// src/components/calendar/components/calendar-event.tsx
import { type CalendarEvent, familyMembers, colorMap } from "@/lib/calendar-data"
import { cn } from "@/lib/utils"

interface CalendarEventCardProps {
  event: CalendarEvent
  onClick?: () => void
  variant?: "default" | "large"
}

export function CalendarEventCard({
  event,
  onClick,
  variant = "default"
}: CalendarEventCardProps) {
  const member = familyMembers.find((m) => m.id === event.memberId)
  const colors = member ? colorMap[member.color] : colorMap["bg-coral"]

  if (variant === "large") {
    return (
      <button
        onClick={onClick}
        className={cn(
          "w-full text-left rounded-xl p-4",
          "transition-all hover:scale-[1.01] hover:shadow-md",
          "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
          colors?.light
        )}
      >
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "w-2 h-full min-h-[60px] rounded-full",
              colors?.bg
            )}
          />
          <div className="flex-1 min-w-0">
            <h4 className={cn("font-semibold text-base truncate", colors?.text)}>
              {event.title}
            </h4>
            <p className="text-sm text-muted-foreground mt-1">
              {event.startTime} - {event.endTime}
            </p>
            {event.location && (
              <p className="text-sm text-muted-foreground truncate mt-1">
                📍 {event.location}
              </p>
            )}
          </div>
        </div>
      </button>
    )
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-xl p-3",
        "transition-all hover:scale-[1.02] hover:shadow-md",
        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
        colors?.light
      )}
    >
      <div className="flex items-start gap-2">
        <div
          className={cn(
            "w-1.5 h-full min-h-[40px] rounded-full flex-shrink-0",
            colors?.bg
          )}
        />
        <div className="flex-1 min-w-0">
          <h4 className={cn("font-semibold text-sm truncate", colors?.text)}>
            {event.title}
          </h4>
          <p className="text-xs text-muted-foreground">
            {event.startTime} - {event.endTime}
          </p>
        </div>
        <div className={cn("w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0", colors?.bg)} />
      </div>
    </button>
  )
}
```

### 13.2 Custom Hook: useCalendarEvents

```typescript
// src/lib/hooks/use-calendar-events.ts
import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api/client'
import type { CalendarEvent } from '@/lib/types'

interface UseCalendarEventsOptions {
  start: Date
  end: Date
  autoFetch?: boolean
}

interface UseCalendarEventsReturn {
  events: CalendarEvent[]
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useCalendarEvents({
  start,
  end,
  autoFetch = true,
}: UseCalendarEventsOptions): UseCalendarEventsReturn {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchEvents = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        start: start.toISOString(),
        end: end.toISOString(),
      })

      const data = await apiClient.get<{ events: CalendarEvent[] }>(
        `/events?${params}`
      )

      setEvents(data.events)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
      setEvents([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (autoFetch) {
      fetchEvents()
    }
  }, [start.getTime(), end.getTime(), autoFetch])

  return {
    events,
    isLoading,
    error,
    refetch: fetchEvents,
  }
}

// Usage
function WeeklyCalendar({ currentDate }: { currentDate: Date }) {
  const weekStart = startOfWeek(currentDate)
  const weekEnd = endOfWeek(currentDate)

  const { events, isLoading, error, refetch } = useCalendarEvents({
    start: weekStart,
    end: weekEnd,
  })

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage error={error} onRetry={refetch} />

  return <CalendarGrid events={events} />
}
```

### 13.3 Utility Function: Date Formatting

```typescript
// src/lib/utils/date-format.ts
import { format, parse, isToday, isTomorrow, isYesterday } from 'date-fns'

export function formatEventDate(date: Date): string {
  if (isToday(date)) return 'Today'
  if (isTomorrow(date)) return 'Tomorrow'
  if (isYesterday(date)) return 'Yesterday'

  return format(date, 'EEEE, MMMM d')  // "Monday, January 15"
}

export function formatEventTime(time: string): string {
  // Input: "9:00 AM" or "14:30"
  // Output: Normalized to "9:00 AM"

  if (time.includes('AM') || time.includes('PM')) {
    return time  // Already formatted
  }

  // Convert 24-hour to 12-hour
  const [hours, minutes] = time.split(':')
  const hour = parseInt(hours)
  const period = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 || 12

  return `${hour12}:${minutes} ${period}`
}

export function parseEventTime(time: string): { hours: number; minutes: number } {
  // Input: "9:00 AM" or "14:30"
  // Output: { hours: 9, minutes: 0 }

  const parsed = parse(time, 'h:mm a', new Date())

  return {
    hours: parsed.getHours(),
    minutes: parsed.getMinutes(),
  }
}

export function calculateEventDuration(startTime: string, endTime: string): number {
  const start = parseEventTime(startTime)
  const end = parseEventTime(endTime)

  const startMinutes = start.hours * 60 + start.minutes
  const endMinutes = end.hours * 60 + end.minutes

  return endMinutes - startMinutes  // Duration in minutes
}
```

---

## 14. Performance Optimization

### 14.1 Code Splitting (Phase 2)

**Lazy Load Non-Critical Modules:**

```typescript
// src/App.tsx
import { lazy, Suspense } from 'react'

// Lazy load module views
const ChoresView = lazy(() => import('@/components/chores/chores-view'))
const MealsView = lazy(() => import('@/components/meals/meals-view'))
const ListsView = lazy(() => import('@/components/lists/lists-view'))
const PhotosView = lazy(() => import('@/components/photos/photos-view'))

export default function FamilyHub() {
  const renderContent = () => {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        {activeTab === 'calendar' && <CalendarContent />}
        {activeTab === 'chores' && <ChoresView />}
        {activeTab === 'meals' && <MealsView />}
        {activeTab === 'lists' && <ListsView />}
        {activeTab === 'photos' && <PhotosView />}
      </Suspense>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* ... */}
      <main>{renderContent()}</main>
    </div>
  )
}
```

**Manual Chunks (Vite Config):**

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-ui': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-popover',
            '@radix-ui/react-label',
          ],
          'vendor-utils': ['date-fns', 'clsx', 'tailwind-merge'],
        },
      },
    },
  },
})
```

### 14.2 Memoization

**useMemo for Expensive Calculations:**

```typescript
import { useMemo } from 'react'

export function WeeklyCalendar({ events, filter }: WeeklyCalendarProps) {
  // Memoize filtered events (only recalculate when events or filter changes)
  const filteredEvents = useMemo(() => {
    return events.filter((event) =>
      filter.selectedMembers.includes(event.memberId)
    )
  }, [events, filter.selectedMembers])

  // Memoize grouped events (expensive operation)
  const eventsByDay = useMemo(() => {
    return groupEventsByDay(filteredEvents)
  }, [filteredEvents])

  return <CalendarGrid events={eventsByDay} />
}
```

**React.memo for Component Optimization:**

```typescript
import { memo } from 'react'

export const CalendarEventCard = memo(function CalendarEventCard({
  event,
  onClick,
}: CalendarEventCardProps) {
  // Component only re-renders if event or onClick changes
  return (
    <button onClick={onClick}>
      {event.title}
    </button>
  )
}, (prevProps, nextProps) => {
  // Custom comparison function
  return prevProps.event.id === nextProps.event.id &&
         prevProps.event.title === nextProps.event.title
})
```

### 14.3 Virtual Scrolling (For Long Lists)

**For lists with 100+ items:**

```typescript
import { FixedSizeList } from 'react-window'

function EventList({ events }: { events: CalendarEvent[] }) {
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const event = events[index]

    return (
      <div style={style}>
        <CalendarEventCard event={event} />
      </div>
    )
  }

  return (
    <FixedSizeList
      height={600}
      itemCount={events.length}
      itemSize={80}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  )
}
```

---

## 15. Build & Deployment

### 15.1 Build Configuration

**Production Build:**
```bash
npm run build
```

**Vite Config:**
```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,  // Generate source maps for debugging
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom'],
          'ui': ['@radix-ui/react-dialog', '@radix-ui/react-popover'],
        },
      },
    },
    // Optimize chunk size warnings
    chunkSizeWarningLimit: 1000,  // 1MB
  },
  server: {
    port: 5173,
    open: true,  // Auto-open browser on dev start
  },
  preview: {
    port: 4173,
  },
})
```

### 15.2 Environment Variables

**Setup:**
```bash
# .env.local (gitignored)
VITE_API_BASE_URL=https://api.familyhub.com
VITE_WS_URL=wss://api.familyhub.com/ws
VITE_GOOGLE_CALENDAR_API_KEY=your_key_here
```

**Usage:**
```typescript
// Access env vars with import.meta.env
const API_URL = import.meta.env.VITE_API_BASE_URL
const WS_URL = import.meta.env.VITE_WS_URL

// Type safety
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_WS_URL: string
  readonly VITE_GOOGLE_CALENDAR_API_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

**Different Environments:**
```bash
# .env.development
VITE_API_BASE_URL=http://localhost:8080/api

# .env.production
VITE_API_BASE_URL=https://api.familyhub.com/api
```

### 15.3 Deployment (Digital Ocean - Phase 2)

**Build & Deploy Script:**
```bash
#!/bin/bash
# deploy.sh

# Build frontend
npm run build

# Upload to server
scp -r dist/* user@your-server.com:/var/www/familyhub/

# Restart nginx (if needed)
ssh user@your-server.com "sudo systemctl reload nginx"
```

**Nginx Config:**
```nginx
server {
    listen 80;
    server_name familyhub.com www.familyhub.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name familyhub.com www.familyhub.com;

    # SSL certificates (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/familyhub.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/familyhub.com/privkey.pem;

    # Root directory
    root /var/www/familyhub;
    index index.html;

    # Serve static files
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API proxy (Phase 2)
    location /api/ {
        proxy_pass http://localhost:8080/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 16. Accessibility

### 16.1 ARIA Labels

**Icon-Only Buttons:**
```tsx
<button aria-label="Add new event">
  <Plus className="h-5 w-5" />
</button>

<button aria-label="Close menu" onClick={onClose}>
  <X className="h-5 w-5" />
</button>
```

**Screen Reader Announcements:**
```tsx
<div role="alert" aria-live="polite">
  Event added successfully
</div>

<div role="status" aria-live="polite" aria-atomic="true">
  Showing {events.length} events for {selectedDate}
</div>
```

### 16.2 Keyboard Navigation

**Focus Management:**
```tsx
import { useRef, useEffect } from 'react'

function AddEventModal({ isOpen }: { isOpen: boolean }) {
  const titleInputRef = useRef<HTMLInputElement>(null)

  // Auto-focus first field when modal opens
  useEffect(() => {
    if (isOpen) {
      titleInputRef.current?.focus()
    }
  }, [isOpen])

  // Trap focus within modal
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    }

    if (e.key === 'Tab') {
      // Implement focus trap logic
    }
  }

  return (
    <div onKeyDown={handleKeyDown}>
      <input ref={titleInputRef} {...} />
    </div>
  )
}
```

**Keyboard Shortcuts:**
```typescript
useEffect(() => {
  const handleGlobalKeyPress = (e: KeyboardEvent) => {
    // Don't trigger when typing in inputs
    if (e.target instanceof HTMLInputElement) return

    switch (e.key) {
      case 'n':
        // Open new event modal
        setIsEventModalOpen(true)
        break
      case 't':
        // Jump to today
        setCurrentDate(new Date())
        break
      case 'ArrowLeft':
        // Previous week
        setCurrentDate(prev => subWeeks(prev, 1))
        break
      case 'ArrowRight':
        // Next week
        setCurrentDate(prev => addWeeks(prev, 1))
        break
    }
  }

  window.addEventListener('keydown', handleGlobalKeyPress)
  return () => window.removeEventListener('keydown', handleGlobalKeyPress)
}, [])
```

### 16.3 Screen Reader Support

**Semantic HTML:**
```tsx
<header>
  <h1>FamilyHub</h1>
</header>

<nav aria-label="Main navigation">
  <NavigationTabs />
</nav>

<main>
  <section aria-labelledby="calendar-heading">
    <h2 id="calendar-heading" className="sr-only">
      Calendar for week of {formatDate(currentDate)}
    </h2>
    <WeeklyCalendar />
  </section>
</main>
```

**Screen Reader Only Text:**
```css
/* In index.css */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

---

## 17. Error Handling

### 17.1 Error Boundaries

```typescript
// src/components/shared/error-boundary.tsx
import { Component, ReactNode } from 'react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)

    // Log to error tracking service (Phase 2)
    // Sentry.captureException(error, { extra: errorInfo })
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex flex-col items-center justify-center h-screen p-8">
            <div className="max-w-md text-center">
              <h2 className="text-2xl font-bold text-destructive mb-4">
                Oops! Something went wrong
              </h2>
              <p className="text-muted-foreground mb-6">
                {this.state.error?.message || 'An unexpected error occurred'}
              </p>
              <Button
                onClick={() => window.location.reload()}
                variant="default"
              >
                Reload Page
              </Button>
            </div>
          </div>
        )
      )
    }

    return this.props.children
  }
}

// Usage in App.tsx
export default function FamilyHub() {
  return (
    <ErrorBoundary>
      {/* App content */}
    </ErrorBoundary>
  )
}
```

### 17.2 API Error Handling

**Typed Error Response:**
```typescript
// src/lib/api/errors.ts
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export async function handleApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))

    throw new ApiError(
      error.message || `HTTP ${response.status}: ${response.statusText}`,
      response.status,
      error.code,
      error.details
    )
  }

  return response.json()
}
```

**Error Handling in Components:**
```typescript
import { toast } from 'sonner'  // Toast library

async function handleCreateEvent(event: CalendarEvent) {
  try {
    await apiClient.post('/events', event)
    toast.success('Event created successfully')
  } catch (error) {
    if (error instanceof ApiError) {
      switch (error.status) {
        case 400:
          toast.error(`Invalid event data: ${error.message}`)
          break
        case 401:
          toast.error('Please log in to create events')
          break
        case 500:
          toast.error('Server error. Please try again later.')
          break
        default:
          toast.error(error.message)
      }
    } else {
      toast.error('An unexpected error occurred')
    }
  }
}
```

---

## 18. Migration Checklist

### Phase 1B: Frontend Polish (Current Sprint)

**State Management:**
- [ ] Implement Zustand store for calendar state
- [ ] Migrate from local `useState` to Zustand
- [ ] Add persistence for filter state (localStorage)
- [ ] Create loading states for all async operations
- [ ] Add error states with user-friendly messages

**API Integration:**
- [ ] Create mock API service layer (`src/lib/api/mock.ts`)
- [ ] Replace direct state mutations with API calls
- [ ] Add retry logic for failed requests
- [ ] Implement optimistic updates

**Forms:**
- [ ] Add Zod validation to all forms
- [ ] Implement error messages for invalid inputs
- [ ] Add loading states to submit buttons
- [ ] Test form validation edge cases

**PWA:**
- [ ] Install and configure Vite PWA plugin
- [ ] Create `manifest.json` with app metadata
- [ ] Add app icons (192x192, 512x512)
- [ ] Configure service worker (Workbox)
- [ ] Test offline functionality
- [ ] Test "Add to Home Screen" on iOS/Android

**Testing:**
- [ ] Set up Vitest + Testing Library
- [ ] Write unit tests for calendar views
- [ ] Write unit tests for utility functions
- [ ] Set up Playwright for E2E testing
- [ ] Write E2E tests for critical user flows
- [ ] Achieve 70%+ test coverage

**Performance:**
- [ ] Optimize event rendering (memoization)
- [ ] Add loading skeletons for async content
- [ ] Lazy load non-critical modules
- [ ] Optimize bundle size (check with `npm run build -- --analyze`)

### Phase 2: Backend Integration

**API Client:**
- [ ] Replace mock API with real API client
- [ ] Add authentication headers (if needed)
- [ ] Implement request/response interceptors
- [ ] Add retry logic with exponential backoff

**WebSocket:**
- [ ] Implement WebSocket client
- [ ] Add auto-reconnect logic
- [ ] Handle connection state (connecting, connected, disconnected)
- [ ] Test real-time sync across multiple devices

**Google Calendar:**
- [ ] Implement OAuth flow
- [ ] Fetch events from Google Calendar API
- [ ] Two-way sync (local ↔ Google Calendar)
- [ ] Handle sync conflicts (last-write-wins)

**Deployment:**
- [ ] Set up Digital Ocean droplet
- [ ] Configure Nginx reverse proxy
- [ ] Install SSL certificate (Let's Encrypt)
- [ ] Set up CI/CD pipeline (GitHub Actions)
- [ ] Configure environment variables
- [ ] Test production build

### Phase 3: Additional Modules

**Chores Module:**
- [ ] Refactor into `/components/chores/` directory
- [ ] Connect to backend API
- [ ] Add real-time sync

**Meals Module:**
- [ ] Refactor into `/components/meals/` directory
- [ ] Connect to backend API
- [ ] Add meal planning features

**Lists Module:**
- [ ] Refactor into `/components/lists/` directory
- [ ] Connect to backend API
- [ ] Add list sharing features

**Photos Module:**
- [ ] Refactor into `/components/photos/` directory
- [ ] Integrate with cloud storage (S3/Spaces)
- [ ] Add photo upload/management

---

## Appendix

### Useful Commands

```bash
# Development
npm run dev              # Start dev server (http://localhost:5173)
npm run build            # Production build
npm run preview          # Preview production build
npm run lint             # Run ESLint
npm run type-check       # TypeScript type checking

# Testing
npm run test             # Run Vitest tests
npm run test:ui          # Vitest UI
npm run test:e2e         # Run Playwright E2E tests
npm run test:coverage    # Generate coverage report

# Dependencies
npm install              # Install all dependencies
npm outdated             # Check for outdated packages
npm update               # Update dependencies
```

### Related Documentation

- **Product Requirements:** See `docs/family-calendar-prd.md`
- **README:** See `README.md` for project overview
- **Plan:** See `.claude/plans/lazy-crafting-turing.md` for refactoring plan

---

**End of Frontend Specification**

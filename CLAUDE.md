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

- **App.tsx** - Root component managing all app state (current date, active tab, calendar view, events, filters)
- **src/lib/calendar-data.ts** - Data models and sample data generators for `FamilyMember`, `CalendarEvent`, `ChoreItem`, `MealPlan`
- **src/lib/utils.ts** - `cn()` utility for Tailwind class merging

### Component Organization

```
src/components/
├── ui/           # Base primitives (button, input, label) - shadcn/ui style with CVA
├── shared/       # App-wide components (NavigationTabs, CalendarHeader, SidebarMenu)
├── calendar/
│   ├── views/    # DailyCalendar, WeeklyCalendar, MonthlyCalendar, ScheduleCalendar
│   └── components/  # AddEventModal, CalendarEvent, FamilyFilterPills, etc.
└── *-view.tsx    # Tab views (ChoresView, MealsView, ListsView, PhotosView)
```

Barrel exports: Import from `@/components/calendar` or `@/components/shared` rather than individual files.

### State Management

All state lives in App.tsx using useState hooks:
- `currentDate` - Selected date for calendar navigation
- `activeTab` - Current tab (calendar, chores, meals, lists, photos)
- `calendarView` - View type (daily, weekly, monthly, schedule)
- `filter` - Family member filtering with `FilterState` type
- `events` - Array of `CalendarEvent` objects

### Styling

**Tailwind CSS v4** with PostCSS. Colors defined as CSS variables in `src/index.css` using oklch color space.

Family member colors: `bg-coral`, `bg-teal`, `bg-green`, `bg-purple`, `bg-yellow`, `bg-pink`, `bg-orange`

The `colorMap` in calendar-data.ts provides bg/text/light variants for each family color.

### Component Patterns

Use CVA (class-variance-authority) for components with variants:

```typescript
const variants = cva("base-classes", {
  variants: { variant: {...}, size: {...} },
  defaultVariants: { variant: "default", size: "default" }
})
```

Always use `cn()` for className merging. Import alias: `@/` maps to `src/`.

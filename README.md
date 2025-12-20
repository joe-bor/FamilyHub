# FamilyHub

A modern, modular family dashboard application for managing calendars, meals, chores, and more.

## Overview

FamilyHub is designed as a **modular dashboard** with distinct sections/modules:

- **Calendar** (MVP Focus) - Family scheduling and events with multi-person support
- **Lists** (Future Module) - Grocery lists, to-do lists, etc.
- **Chores** (Future Module) - Task management and assignments
- **Meals** (Future Module) - Meal planning and recipes
- **Photos** (Future Module) - Family photo gallery

**Current Status:** The Calendar module is feature-complete with prototype UI. Other modules have basic prototype UI but are deferred to Phase 3.

## Tech Stack

### Frontend (Current Repository)
- **React 18** with TypeScript
- **Vite 7.x** - Build tool and dev server
- **TanStack Query** - Server state management with caching
- **Zustand** - Client UI state management
- **Tailwind CSS v4** - Utility-first CSS with PostCSS
- **shadcn/ui** - Component library built on Radix UI primitives
- **date-fns** - Date manipulation library
- **React Hook Form + Zod** - Form validation
- **Nunito** - Google Fonts typography

### Design System
- **OKLch color space** - Perceptually uniform colors
- **Warm cream/peach tones** - Primary palette
- **Family member colors** - Coral, Teal, Green, Pink, Purple, Yellow

### Backend (Phase 2 - Separate Repository)
- Spring Boot
- PostgreSQL
- Google Calendar API integration
- WebSocket for real-time sync

## Getting Started

### Prerequisites
- Node.js 18+ and npm/pnpm/yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run TypeScript type checking
npm run build -- --noEmit
```

The dev server will start at `http://localhost:5173`

## Project Structure

```
family-hub/
├── src/
│   ├── api/                         # API layer (TanStack Query + services)
│   │   ├── client/                  # HTTP client and error handling
│   │   ├── hooks/                   # TanStack Query hooks (useCalendarEvents, etc.)
│   │   ├── services/                # API service functions
│   │   ├── mocks/                   # Mock API handlers (dev mode)
│   │   └── index.ts                 # Barrel exports
│   ├── providers/                   # React context providers
│   │   └── query-provider.tsx       # TanStack Query setup with DevTools
│   ├── stores/                      # Zustand UI state management
│   │   ├── app-store.ts             # App-wide state (activeTab, sidebar)
│   │   ├── calendar-store.ts        # Calendar UI state (date, view, filters)
│   │   └── index.ts                 # Barrel exports + selectors
│   ├── components/
│   │   ├── ui/                      # shadcn/ui primitives (button, input, label)
│   │   ├── shared/                  # Cross-module shared components
│   │   │   ├── app-header.tsx
│   │   │   ├── navigation-tabs.tsx
│   │   │   ├── sidebar-menu.tsx
│   │   │   └── index.ts             # Barrel exports
│   │   ├── calendar/                # Calendar module (MVP)
│   │   │   ├── CalendarModule.tsx   # Module orchestrator (wires API to views)
│   │   │   ├── views/               # Calendar view components
│   │   │   └── components/          # Calendar-specific components
│   │   ├── chores-view.tsx          # Chores module (Phase 3)
│   │   ├── meals-view.tsx           # Meals module (Phase 3)
│   │   ├── lists-view.tsx           # Lists module (Phase 3)
│   │   └── photos-view.tsx          # Photos module (Phase 3)
│   ├── lib/                         # Utilities and types
│   │   ├── types/                   # Centralized TypeScript types
│   │   └── utils.ts                 # Utility functions (cn)
│   ├── App.tsx                      # Main application component
│   ├── main.tsx                     # Application entry point
│   └── index.css                    # Global styles and Tailwind imports
├── docs/                            # Documentation
│   ├── frontend-spec.md             # Frontend specification (comprehensive)
│   ├── family-calendar-prd.md       # Product requirements document
│   └── PRD-REVISIONS.md             # (Archived)
├── public/                          # Static assets
├── index.html                       # HTML entry point
├── vite.config.ts                   # Vite configuration
├── tsconfig.app.json                # TypeScript configuration
├── postcss.config.js                # PostCSS configuration (Tailwind v4)
└── package.json                     # Dependencies
```

## Family Members & Colors

The application supports 6 family member profiles:

| Member   | ID  | Color      | Hex Color |
|----------|-----|------------|-----------|
| Mom      | 1   | Coral      | `#e88470` |
| Dad      | 2   | Teal       | `#5cb8b2` |
| Ethan    | 3   | Green      | `#7bc67b` |
| Grandma  | 4   | Pink       | `#e896b8` |
| Grandpa  | 5   | Purple     | `#9b7bcf` |
| Family   | 6   | Yellow     | `#f5c842` |

## Calendar Features (MVP)

### Views
- **Day View** - Hourly timeline (6 AM - 11 PM)
- **Week View** - 7-day timeline with events
- **Month View** - Traditional calendar grid
- **Schedule View** - Agenda-style list

### Features
- ✅ Multi-person event support
- ✅ Combined color display for shared events
- ✅ Profile-based filtering
- ✅ Event CRUD operations (Create, Read, Update, Delete)
- ✅ Current time indicator
- ✅ Responsive design
- ✅ Mock data generation

### Deferred Features (Phase 2)
- ⏳ Backend API integration
- ⏳ Google Calendar sync
- ⏳ Real-time updates (WebSocket)
- ⏳ Persistent storage
- ⏳ Authentication

## Development Roadmap

### ✅ Phase 1A: Calendar Prototype Migration (Complete)
- Migrated from Next.js to React + Vite
- All 25 components functional
- Calendar views implemented
- Mock data system
- Tailwind CSS v4 integration
- shadcn/ui component library

### 🚧 Phase 1B: Calendar Frontend Polish (Current)
- [x] Implement state management (Zustand for UI, TanStack Query for server state)
- [x] Create mock API service layer with TanStack Query hooks
- [x] Add loading states and error handling
- [ ] Implement form validation with Zod
- [ ] Optimize event rendering performance
- [ ] PWA configuration (manifest, service worker)
- [ ] Component testing (Vitest + Testing Library)
- [ ] E2E testing (Playwright)

### ⏳ Phase 2: Calendar Backend Integration
- [ ] Spring Boot API development (separate repo)
- [ ] PostgreSQL database schema
- [ ] Calendar API endpoints
- [ ] Google Calendar API integration
- [ ] WebSocket real-time sync
- [ ] Authentication & authorization
- [ ] Frontend API integration

### ⏳ Phase 3: Additional Modules
- [ ] Lists module (grocery, to-do)
- [ ] Chores module (task assignments)
- [ ] Meals module (meal planning)
- [ ] Photos module (gallery)
- [ ] Module-specific backend APIs

## Design Tokens

### Colors (OKLch)
```css
--background: oklch(0.98 0.01 85);      /* Warm cream */
--primary: oklch(0.55 0.18 285);        /* Purple accent */
--color-coral: oklch(0.72 0.15 25);     /* Mom */
--color-teal: oklch(0.65 0.12 195);     /* Dad */
--color-green: oklch(0.68 0.15 145);    /* Ethan */
--color-pink: oklch(0.72 0.15 345);     /* Grandma */
--color-purple: oklch(0.62 0.18 285);   /* Grandpa */
--color-yellow: oklch(0.80 0.15 95);    /* Family */
```

### Typography
- **Font Family**: Nunito (400, 500, 600, 700, 800)
- **Base Size**: 16px
- **Scale**: Tailwind default scale

## Key Files

### API Layer
- `src/api/hooks/use-calendar.ts` - TanStack Query hooks for calendar operations
- `src/api/services/calendar.service.ts` - Calendar API service functions
- `src/api/mocks/calendar.mock.ts` - Mock handlers with simulated delays
- `src/providers/query-provider.tsx` - TanStack Query configuration

### Data Models
See `src/lib/types/` for centralized TypeScript types:
- `calendar.ts` - CalendarEvent, API request/response types
- `family.ts` - FamilyMember, colorMap
- `chores.ts` - ChoreItem
- `meals.ts` - MealPlan

### Main Components
- `src/App.tsx` - Main dashboard component
- `src/components/calendar/CalendarModule.tsx` - Calendar module orchestrator
- `src/components/shared/app-header.tsx` - Top navigation bar
- `src/components/shared/navigation-tabs.tsx` - Left sidebar module switcher
- `src/components/calendar/views/` - Day, Week, Month, Schedule views

## Documentation

- **Product Requirements Document**: See `docs/family-calendar-prd.md` for complete product specification, architecture, and roadmap
- **API Contract**: API specifications are documented in the PRD (Section 8.1 - Frontend-Backend API Contract)

## Architecture Decisions

### Why React + Vite instead of Next.js?
- Avoid vendor lock-in
- Cleaner separation between frontend and backend
- Faster dev server and build times
- More control over build configuration

### Why Tailwind CSS v4?
- Latest CSS features with PostCSS-only architecture
- Smaller bundle size
- Better performance
- Modern color spaces (OKLch)

### Why shadcn/ui?
- Copy-paste components (full ownership)
- Built on Radix UI (accessibility)
- Full customization control
- No component library lock-in

### Why Modular Dashboard Approach?
- Focused MVP development (Calendar first)
- Clear separation of concerns
- Easier testing and maintenance
- Ability to ship features incrementally

## Contributing

This is a personal/family project. The development follows a phased approach:
1. Complete Calendar module (MVP)
2. Add backend integration
3. Expand to other modules

## License

Private project - All rights reserved

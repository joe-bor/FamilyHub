# FamilyHub PRD - Recommended Revisions

**⚠️ ARCHIVED - December 14, 2024**

This document has been **merged into the main PRD** (`docs/family-calendar-prd.md` v1.3).

All recommendations from this document have been applied to the main PRD, which is now the single source of truth for the FamilyHub project.

**For current project documentation, see:**
- `docs/family-calendar-prd.md` - Complete product requirements and specification
- `README.md` - Project overview and getting started guide

---

## Original Document

This document outlined the recommended changes to align the PRD with the current FamilyHub implementation.

---

## 1. Global Changes

### Product Name

Replace all instances of:

- "Family Touchscreen Calendar Application" → "FamilyHub"
- "Family Calendar" → "FamilyHub"
- "Skylight Calendar clone" → "FamilyHub (inspired by Skylight Calendar)"

---

## 2. Executive Summary Updates

Replace the first paragraph with:

> ### Product Overview
>
> **FamilyHub** is a custom-built, family-friendly touchscreen calendar application designed to replace expensive commercial solutions (like Skylight Calendar) while providing a centralized hub for family scheduling, task management, meal planning, and visual organization. The system will run on a dedicated 20"+ touchscreen display powered by a mini PC, with full mobile access via Progressive Web App (PWA) architecture.

---

## 3. Section 6: Product Scope - Updates

### 3.1 Architecture: Modular Dashboard Approach

Add this clarification at the beginning of Section 6:

```markdown
### Product Architecture

FamilyHub is designed as a **modular dashboard** with distinct sections:

1. **Calendar** (MVP Focus) - Family scheduling and events
2. **Lists** (Future Module) - Grocery lists, to-do lists, etc.
3. **Chores** (Future Module) - Task management and assignments
4. **Meals** (Future Module) - Meal planning and recipes
5. **Photos** (Future Module) - Family photo gallery

**MVP Strategy:** Build and complete the Calendar module first, then
expand to other modules iteratively. This allows focus on core
functionality before adding additional features.
```

### 3.2 In Scope (MVP - Phase 1) - CALENDAR MODULE ONLY

Update the MVP scope to focus on Calendar:

```markdown
**Dashboard Navigation:**
✅ Modular navigation structure (5 tabs: Calendar, Lists, Chores, Meals, Photos)
✅ Vertical tab bar with icons
✅ Touch-optimized navigation
✅ Active module highlighting

**Calendar Module (MVP Focus):**
✅ Four view types: Day, Week, Month, Schedule (agenda list)
✅ Google Calendar integration (read/write via API)
✅ Add/Edit/Delete events from touchscreen
✅ Color-coded events per family member (6 profiles)
✅ Profile-based filtering (show/hide specific people)
✅ Multi-person event support with combined colors
✅ Event details display (time, title, location)
✅ Current time indicator in day/week views
✅ Today button for quick navigation
✅ Week/month navigation (prev/next)
✅ Touch-optimized calendar grid
✅ Event modal with form validation

**Multi-Device Access:**
✅ Progressive Web App (PWA) architecture
✅ Mobile-responsive design
✅ Real-time sync between devices (via backend WebSocket)
✅ Installable on home screen (iOS/Android)
```

### 3.3 Prototype UI Exists (Deferred to Future Modules)

These have frontend UI prototypes but are **not in MVP scope**:

```markdown
**Lists Module (Prototype Only - Post-MVP):**
📋 UI Prototype: Multiple list types (Grocery, To-Do, Gift Ideas, Vacation)
📋 UI Prototype: List item creation and completion
📋 UI Prototype: List navigation and detail views
❌ Backend: Not implemented (deferred to Phase 2)
❌ Scope: Excluded from MVP
**Status:** UI exists for dashboard navigation, full implementation deferred

**Chores Module (Prototype Only - Post-MVP):**
📋 UI Prototype: Task list view grouped by family member
📋 UI Prototype: Task creation and completion
📋 UI Prototype: Chore assignment and due dates
❌ Backend: Not implemented (deferred to Phase 2)
❌ Scope: Excluded from MVP
**Status:** UI exists for dashboard navigation, full implementation deferred

**Meals Module (Prototype Only - Post-MVP):**
📋 UI Prototype: Weekly meal planner UI
📋 UI Prototype: Breakfast/Lunch/Dinner display per day
📋 UI Prototype: Day navigation and selection
❌ Backend: Not implemented (deferred to Phase 2)
❌ Scope: Excluded from MVP
**Status:** UI exists for dashboard navigation, full implementation deferred

**Photos Module (Prototype Only - Post-MVP):**
📋 UI Prototype: Photo grid display
📋 UI Prototype: Lightbox viewer with navigation
📋 UI Prototype: Upload button UI
❌ Backend: Not implemented (deferred to Phase 2)
❌ Scope: Excluded from MVP
**Status:** UI exists for dashboard navigation, full implementation deferred
```

### 3.4 Update "Out of Scope" Section:

Keep these explicitly out of scope for MVP:

**Modules (Deferred to Post-MVP):**
- ❌ Chores/Task Management - Prototype UI exists, backend deferred to Phase 2
- ❌ Meal Planning - Prototype UI exists, backend deferred to Phase 2
- ❌ Lists (Grocery/To-Do) - Prototype UI exists, backend deferred to Phase 2
- ❌ Photos Gallery - Prototype UI exists, backend deferred to Phase 2

**Features (Future Enhancements):**
- ❌ Weather Widgets - Future enhancement
- ❌ Notifications/Alerts - Future enhancement
- ❌ Photo Screensaver Mode - Future enhancement
- ❌ User Authentication - Single-family use (no login for MVP)
- ❌ Third-party Calendar Integrations (Apple, Outlook) - Google Calendar only
- ❌ Recurring Event Templates - Create manually for MVP
- ❌ Advanced Task Categories - Future enhancement
- ❌ Location/Map Integration - Future enhancement
- ❌ Voice Control - Future enhancement
- ❌ Offline Mode - Requires active internet connection

---

## 4. Section 8: Technical Architecture - Updates

### 4.1 Add Repository Structure Section:

```markdown
### 8.0 Repository Structure

The project is split into two repositories:

1. **family-hub** (Frontend)

   - React 18+ with Vite
   - Progressive Web App (PWA)
   - All UI components and client-side state
   - Repository: `family-hub`

2. **family-hub-api** (Backend) - _Future_
   - Spring Boot 3.x REST API
   - PostgreSQL database
   - Google Calendar integration
   - WebSocket server
   - Repository: `family-hub-api` (to be created)
```

### 4.2 Update Technology Stack - Frontend Section:

```markdown
**Frontend (family-hub repository):**

- **Framework:** React 18.x with TypeScript
- **Build Tool:** Vite 7.x (fast dev experience, HMR)
- **Component Library:** shadcn/ui (Radix UI primitives)
- **Styling:** Tailwind CSS v4 with PostCSS
- **State Management:** React useState/useReducer (local state for MVP)
- **Icons:** Lucide React
- **Date Handling:** date-fns
- **Form Validation:** React Hook Form + Zod
- **Theme:** next-themes (dark mode support ready)
- **Calendar Components:** Custom implementation (not FullCalendar)
- **Path Aliases:** @ → src/

**Note:** FullCalendar was evaluated but custom components were built
instead for better control over touch UX and Skylight-inspired styling.
```

---

## 5. Section 4: User Personas - Updates

### Update Family Member Configuration:

The prototype supports 6 family member profiles (expandable):

### Default Family Member Profiles

| Profile | Color  | CSS Variable   | Use Case            |
| ------- | ------ | -------------- | ------------------- |
| Mom     | Coral  | --color-coral  | Parent 1            |
| Dad     | Teal   | --color-teal   | Parent 2            |
| Ethan   | Green  | --color-green  | Child 1             |
| Grandma | Pink   | --color-pink   | Child 2             |
| Grandpa | Purple | --color-purple | Child 3             |
| Family  | Yellow | --color-yellow | Whole-family events |

_Note: The PRD example showed 3 profiles. The implementation supports
up to 6 by default, easily expandable via configuration._

---

## 6. Section 9: UI Design - Updates

### 6.1 Update Color Palette:

```markdown
### Color Palette (OKLch Color Space)

**Profile Colors:**

- Mom (Coral): oklch(0.72 0.15 25)
- Dad (Teal): oklch(0.65 0.12 195)
- Ethan (Green): oklch(0.7 0.14 145)
- Grandma (Pink): oklch(0.75 0.12 350)
- Grandpa (Purple): oklch(0.6 0.18 285)
- Family (Yellow): oklch(0.85 0.15 90)

**UI Colors (CSS Variables):**

- Background: oklch(0.98 0.01 85) - warm cream
- Card: oklch(1 0 0) - white
- Primary: oklch(0.55 0.18 285) - purple accent
- Foreground: oklch(0.25 0.02 250) - dark text
- Muted: oklch(0.94 0.02 85) - subtle backgrounds
- Border: oklch(0.88 0.02 85) - light borders

**Design System:**

- Uses OKLch color space for perceptually uniform colors
- Warm cream/beige background (Skylight-inspired)
- Purple primary accent color
- Custom scrollbar styling
```

### 6.2 Update Typography:

```markdown
### Typography

**Font Family:** Nunito (Google Fonts)

- Weights: 400 (Regular), 500 (Medium), 600 (Semibold), 700 (Bold), 800 (ExtraBold)
- Loaded via Google Fonts CDN in index.html
- Fallback: system sans-serif

_Note: Nunito was chosen for its friendly, rounded aesthetic that
appeals to children while remaining professional for adults._
```

### 6.3 Update Navigation:

```markdown
### Navigation Structure

**Primary Navigation (Vertical Tab Bar - Left Side):**

1. Calendar (default) - CalendarIcon
2. Lists - ListTodoIcon
3. Chores - CheckSquareIcon
4. Meals - UtensilsCrossedIcon
5. Photos - ImageIcon

**Calendar Sub-Navigation (Top Bar):**

- View Switcher: Day | Week | Month | Schedule
- Family Filter Pills (toggle visibility per member)
- Today Button (in month view)
```

---

## 7. Section 12: Development Phases - Updates

### Replace Phase 1 with FE-First Approach:

```markdown
### Phase 1A: Frontend Foundation (COMPLETED)

**Sprint 1: Project Setup & Migration ✅**

- [x] Migrate from Next.js to React + Vite
- [x] Configure Tailwind CSS v4 with PostCSS
- [x] Set up path aliases (@/ → src/)
- [x] Install all dependencies (Radix UI, date-fns, etc.)
- [x] Configure TypeScript
- [x] Rebrand from Skylight to FamilyHub

**Sprint 2: Core Components (COMPLETED via v0 prototype) ✅**

- [x] Navigation tabs component
- [x] Calendar header with family info
- [x] Weekly calendar view with time slots
- [x] Daily calendar view
- [x] Monthly calendar view
- [x] Schedule (agenda) view
- [x] Color-coded event cards
- [x] Family member filter pills
- [x] Add event modal
- [x] Sidebar menu

**Sprint 3: Additional Views (COMPLETED via v0 prototype) ✅**

- [x] Chores view with family member grouping
- [x] Meals view with day selection
- [x] Lists view with multiple list types
- [x] Photos view with lightbox

### Phase 1B: Calendar Module - Frontend Polish (CURRENT)

**Focus:** Complete Calendar module frontend, prepare for backend integration

**Sprint 4: State Management & Data Layer (Calendar Only)**

- [ ] Implement Zustand or React Context for calendar state
- [ ] Create mock API service layer for events (prepare for backend)
- [ ] Add loading states for calendar operations
- [ ] Add error handling for calendar actions
- [ ] Implement form validation with Zod (event forms)
- [ ] Optimize event rendering performance

**Sprint 5: PWA & Responsive (Calendar Focused)**

- [ ] Configure PWA manifest
- [ ] Set up service worker (Workbox)
- [ ] Test calendar responsive breakpoints (320px - 2560px)
- [ ] Optimize calendar touch targets and gestures
- [ ] Test calendar on actual touchscreen hardware
- [ ] Add install prompt
- [ ] Test offline calendar viewing (cached events)

**Sprint 6: Calendar Testing & Documentation**

- [ ] Component testing for calendar views (Vitest + Testing Library)
- [ ] E2E testing for calendar workflows (Playwright)
- [ ] README with calendar module documentation
- [ ] API contract documentation for calendar endpoints
- [ ] User guide for calendar features

### Phase 2: Calendar Backend Development (NEXT - Separate Repo)

**Focus:** Build backend for Calendar module only

**Sprint 7: Backend Setup (Calendar Module)**

- [ ] Create family-hub-api repository
- [ ] Spring Boot project initialization
- [ ] PostgreSQL database setup
- [ ] Docker containerization
- [ ] Define calendar schema (events, profiles, sync_log)

**Sprint 8: Calendar API Development**

- [ ] REST API endpoints (events CRUD, profiles)
- [ ] Google Calendar OAuth integration
- [ ] Two-way sync implementation (polling + webhooks)
- [ ] Profile assignment storage (in event metadata)
- [ ] Error handling and retry logic

**Sprint 9: Real-Time Calendar Sync**

- [ ] WebSocket server setup (Spring WebSocket)
- [ ] Event broadcast on create/update/delete
- [ ] Frontend WebSocket client integration
- [ ] Real-time sync testing across 3+ devices
- [ ] Conflict resolution (last-write-wins)

### Phase 3: Additional Modules (FUTURE - After Calendar Complete)

**Sprint 10+: Chores Module**
- [ ] Backend: Task database schema
- [ ] Backend: Task CRUD APIs
- [ ] Frontend: Connect to task APIs
- [ ] Enable Chores tab navigation

**Sprint 11+: Meals Module**
- [ ] Backend: Meal plan database schema
- [ ] Backend: Meal plan APIs
- [ ] Frontend: Connect to meal APIs
- [ ] Enable Meals tab navigation

**Sprint 12+: Lists Module**
- [ ] Backend: Lists and items schema
- [ ] Backend: Lists CRUD APIs
- [ ] Frontend: Connect to lists APIs
- [ ] Enable Lists tab navigation

**Sprint 13+: Photos Module**
- [ ] Backend: Photo storage (S3/Digital Ocean Spaces)
- [ ] Backend: Photo upload/management APIs
- [ ] Frontend: Connect to photo APIs
- [ ] Enable Photos tab navigation
```

---

## 8. New Section: Frontend-Backend API Contract

Add this section to define the API contract for the Calendar module (MVP):

## Frontend-Backend API Contract

The frontend is built with these API expectations. The backend
(family-hub-api) should implement these endpoints for **Calendar module first**.

### MVP: Calendar Module APIs

#### Events API (Priority 1 - MVP)

```
GET    /api/events?start={date}&end={date}  - List events in date range
GET    /api/events/:id                       - Get single event details
POST   /api/events                           - Create new event
PUT    /api/events/:id                       - Update existing event
DELETE /api/events/:id                       - Delete event
GET    /api/events/sync                      - Trigger Google Calendar sync
```

**Event Object:**
```json
{
  "id": "string",
  "title": "string",
  "startTime": "string",        // "9:00 AM" format
  "endTime": "string",          // "10:00 AM" format
  "date": "ISO8601 date",
  "memberId": "string",         // Single member ID (for now)
  "isAllDay": "boolean",
  "location": "string?",
  "googleCalendarId": "string"  // Google's event ID
}
```

#### Profiles API (Priority 1 - MVP)

```
GET    /api/profiles                         - List all family members
PUT    /api/profiles/:id                     - Update profile (name, color)
```

**Profile Object:**
```json
{
  "id": "string",
  "name": "string",
  "color": "string",            // e.g., "bg-coral"
  "avatar": "string?"
}
```

#### WebSocket Topics (Priority 1 - MVP)

```
/topic/calendar/events                       - Event create/update/delete broadcasts
/topic/calendar/sync                         - Google Calendar sync status
```

**WebSocket Message Format:**
```json
{
  "type": "EVENT_CREATED | EVENT_UPDATED | EVENT_DELETED",
  "payload": { /* Event object */ },
  "timestamp": "ISO8601",
  "sourceClient": "string"      // To avoid echo
}
```

---

### Future: Additional Module APIs (Post-MVP)

These APIs are **not required for MVP** but shown for future planning:

#### Tasks/Chores API (Phase 3)

```
GET    /api/tasks?assignedTo={profileId}     - List tasks
POST   /api/tasks                            - Create task
PUT    /api/tasks/:id                        - Update task
PATCH  /api/tasks/:id/toggle                 - Toggle completion
DELETE /api/tasks/:id                        - Delete task
```

#### Meals API (Phase 3)

```
GET    /api/meals?week={date}                - Get week's meal plan
PUT    /api/meals/:date                      - Update day's meals
```

#### Lists API (Phase 3)

```
GET    /api/lists                            - Get all lists
GET    /api/lists/:id                        - Get list with items
POST   /api/lists                            - Create list
PUT    /api/lists/:id/items/:itemId          - Update list item
DELETE /api/lists/:id                        - Delete list
```

#### Photos API (Phase 3)

```
GET    /api/photos                           - List all photos
POST   /api/photos                           - Upload photo
DELETE /api/photos/:id                       - Delete photo
GET    /api/photos/:id/thumbnail             - Get thumbnail
```

---

## 9. Document Metadata Updates

```markdown
| Version | Date       | Author | Changes                                    |
| ------- | ---------- | ------ | ------------------------------------------ |
| 1.0     | 2024-12-11 | Joe    | Initial PRD draft                          |
| 1.1     | 2024-12-12 | Joe    | Document status update                     |
| 1.2     | 2024-12-13 | Claude | FE migration complete, PRD alignment       |
|         |            |        | - Renamed to FamilyHub                     |
|         |            |        | - Split FE/BE repositories                 |
|         |            |        | - Updated scope (Meals, Lists, Photos FE)  |
|         |            |        | - Updated color palette to OKLch           |
|         |            |        | - Updated family member config (6 members) |
|         |            |        | - Added FE-first development phases        |
```

---

## Summary of Required PRD Changes

| Section                 | Change Type                                      | Priority |
| ----------------------- | ------------------------------------------------ | -------- |
| Title & Product Name    | Rename to FamilyHub                              | High     |
| Section 6: Scope        | **Calendar module only** - defer others to Phase 3 | **Critical** |
| Section 8: Architecture | Add repo structure, update FE stack              | High     |
| Section 9: Design       | Update colors, fonts, navigation                 | Medium   |
| Section 12: Phases      | Replace with FE-first, Calendar-focused phases   | High     |
| New: API Contract       | Calendar endpoints only (MVP)                    | Medium   |
| Family Members          | Update from 3 to 6 profiles                      | Medium   |

---

## Executive Summary of PRD Alignment

### What Changed:
1. **Product renamed** from "Skylight Calendar clone" to **FamilyHub**
2. **Modular architecture** - Dashboard with 5 modules (Calendar, Lists, Chores, Meals, Photos)
3. **MVP scope narrowed** to **Calendar module only** - other modules have prototype UI but are deferred
4. **Frontend-first approach** - FE complete before backend development starts
5. **Separate repositories** - `family-hub` (FE) and `family-hub-api` (BE, future)

### Current State:
- ✅ **Frontend migration complete** - Next.js → React + Vite
- ✅ **Calendar module UI complete** - 4 views, event management, filtering
- ✅ **Navigation scaffold complete** - 5 tabs ready for future modules
- 📋 **Other modules** - UI prototypes exist but inactive (no backend, no functionality)

### Next Steps:
1. **Phase 1B** - Polish Calendar frontend (state management, PWA, testing)
2. **Phase 2** - Build Calendar backend (Spring Boot API, Google Calendar sync)
3. **Phase 3** - Add additional modules one at a time (Chores → Meals → Lists → Photos)

---

_This revision document should be merged into the main PRD to create a single source of truth._

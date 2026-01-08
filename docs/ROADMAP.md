# FamilyHub Development Roadmap

**Last Updated:** January 7, 2026

## Current Status

**Phase 1C: Backend Preparation** - ✅ COMPLETED

> **Note:** See [TECHNICAL-DEBT.md](./TECHNICAL-DEBT.md) for known issues and deferred improvements.
>
> Both calendar and family data now use TanStack Query with service abstractions.
> The frontend is ready for backend integration - just flip `VITE_USE_MOCK_API=false`.

---

## Phase 1A: Frontend Foundation ✅ COMPLETED

- [x] Sprint 1: Project setup, Next.js → React + Vite migration
- [x] Sprint 2: Core calendar components (all 4 views, event cards, filters)
- [x] Sprint 3: Additional module views (Chores, Meals, Lists, Photos prototypes)

## Phase 1B: Calendar Frontend Polish 🚧 CURRENT

**Sprint 4: State Management & API Layer** ✅ COMPLETED (December 22, 2025)

- [x] Zustand stores for UI state (app-store, calendar-store)
- [x] Centralized types in `src/lib/types/`
- [x] CalendarModule orchestrator component
- [x] TanStack Query API layer with mock handlers
- [x] Loading states and error handling
- [x] Form validation with Zod
- [x] Optimize event rendering performance (React Compiler + algorithmic improvements)
- [x] GitHub Actions CI workflow for PRs
- [x] Event detail view with edit/delete actions (EventDetailModal)
- [x] Full CRUD operations (create, read, update, delete) with optimistic updates
- [x] Centralized date/time utilities in `time-utils.ts` (timezone-safe operations)

**Sprint 5: Family Setup & Responsive** ✅ COMPLETED (December 28, 2025)

Family Onboarding (localStorage-backed): ✅ PR #10
- [x] Welcome screen with "Get Started" CTA
- [x] Family name input screen
- [x] Add family members screen (name + color picker)
- [x] localStorage persistence layer for family data
- [x] First-run detection (redirect to setup if no family exists)

Family Settings (in existing SidebarMenu): ✅ PR #10
- [x] Edit family name
- [x] Member list with edit/remove functionality
- [x] Add new member flow
- [x] Color picker component (7 predefined colors)
- [x] Reset/delete family option

Responsive Design:
- [x] Onboarding screens (mobile-first, 320px - 2560px) - PR #10
- [x] Calendar views responsive refinement (smart defaults, monthly fixes, touch targets)
- [x] Touch target optimization (44px minimum) - PR #10

PWA Basics: ✅ PR #13
- [x] PWA manifest (installable, app icon, splash screen)
- [x] Static asset caching (JS, CSS, images, fonts via Workbox)
- [x] (Deferred: Offline calendar viewing → Phase 2 with real backend)

**Sprint 6: Testing & Polish** ✅ COMPLETED (January 1, 2026)

Component Tests: ✅ COMPLETED (December 29, 2025)
- [x] Store tests: calendar-store (97%), family-store (85%), app-store (100%)
- [x] Validation tests: 100% coverage for all Zod schemas
- [x] Time utility tests: 100% coverage
- [x] Integration tests: CalendarModule, EventForm, OnboardingFlow
- [x] Total: 391 tests across 10 test files

Sidebar Polish: ✅ COMPLETED (December 30, 2025)
- [x] Remove non-functional menu items (Home, Notifications, Customize, Settings, Help, Sign Out)
- [x] Add MemberProfileModal (avatar upload, name, color, email fields)
- [x] Wire sidebar member buttons to open profile modal
- [x] Avatar display in sidebar (show uploaded image or initials fallback)

E2E Tests: ✅ COMPLETED (January 1, 2026)
- [x] Playwright test suites for 4 critical user flows
- [x] Onboarding flow (first-time user experience)
- [x] Calendar CRUD (create, view, edit, delete events)
- [x] Calendar navigation (views, dates, member filtering)
- [x] Family management (settings, member CRUD)

Performance Optimization: ✅ COMPLETED (January 1, 2026)
- [x] Bundle analysis and optimization (rollup-plugin-visualizer, npm run analyze)
- [x] Code splitting (lazy loading for non-primary modules)
- [x] Vendor chunk splitting (react, query, date, radix)
- [x] Unused dependency cleanup (~80 KB savings)
- [x] Deferred advanced monitoring to TECHNICAL-DEBT.md (Web Vitals, Lighthouse CI, RUM)

## Phase 1C: Backend Preparation ✅ COMPLETED

**Sprint 6.5: Family API Service Layer** ✅ COMPLETED (January 7, 2026) - PR #32

Family Service Layer:
- [x] `family.service.ts` - Service abstraction with `USE_MOCK_API` toggle
- [x] `family.mock.ts` - Mock handlers with localStorage persistence
- [x] `use-family.ts` - TanStack Query hooks with optimistic updates
- [x] Family types: `FamilyApiResponse`, request/response types

TanStack Query Hooks:
- [x] `useFamily` - Main query with localStorage seeding for instant startup
- [x] Derived selectors: `useFamilyMembers`, `useFamilyName`, `useSetupComplete`, etc.
- [x] Mutations: `useCreateFamily`, `useUpdateFamily`, `useDeleteFamily`
- [x] Member mutations: `useAddMember`, `useUpdateMember`, `useRemoveMember`
- [x] Optimistic updates with rollback on all mutations

Store Simplification:
- [x] `family-store.ts` reduced to hydration-only (96 lines, down from 208)
- [x] All CRUD operations moved to TanStack Query mutations
- [x] Cross-tab synchronization via storage events

Consumer Migration:
- [x] `App.tsx` - Uses `useSetupComplete()` from API layer
- [x] `OnboardingFlow` - Uses `useCreateFamily()` mutation
- [x] `FamilySettingsModal` - Uses all family/member mutations
- [x] All calendar/shared components import from `@/api`

Test Infrastructure:
- [x] MSW handlers for family API endpoints
- [x] Query hooks test coverage (372 lines)
- [x] Test utilities updated for query cache seeding

## Phase 2: Backend Development ⏳ NEXT

> **Note:** Phase 1C completed the family service layer abstraction. Both calendar and family
> data now use TanStack Query with the same service pattern. Flip `VITE_USE_MOCK_API=false`
> and implement the endpoints below.

**Sprint 7: Backend Setup**
- [ ] Create family-hub-api repository (Spring Boot)
- [ ] PostgreSQL database schema
- [ ] Docker containerization
- [ ] Implement family endpoints (see API contracts below)
- [ ] Implement calendar endpoints (see API contracts below)

**Sprint 8: Google Calendar Integration**
- [ ] Google Calendar OAuth integration
- [ ] Two-way sync (polling + webhooks)
- [ ] Conflict resolution strategy

**Sprint 9: Real-Time Sync**
- [ ] WebSocket server (Spring WebSocket)
- [ ] Frontend WebSocket integration
- [ ] Multi-device sync testing

### API Contracts (Frontend-Ready)

**Family Endpoints:**
```
GET    /family                  → FamilyApiResponse { data: FamilyData | null }
POST   /family                  → FamilyMutationResponse { data: FamilyData }
PATCH  /family                  → FamilyMutationResponse { data: FamilyData }
DELETE /family                  → void
POST   /family/members          → MemberMutationResponse { data: FamilyMember }
PATCH  /family/members/:id      → MemberMutationResponse { data: FamilyMember }
DELETE /family/members/:id      → void
```

**Calendar Endpoints:**
```
GET    /calendar/events         → ApiResponse<CalendarEvent[]> (params: startDate, endDate, memberId)
GET    /calendar/events/:id     → ApiResponse<CalendarEvent>
POST   /calendar/events         → MutationResponse<CalendarEvent>
PATCH  /calendar/events/:id     → MutationResponse<CalendarEvent>
DELETE /calendar/events/:id     → void
```

Types: See `src/lib/types/family.ts` and `src/lib/types/calendar.ts`

## Phase 3: Additional Modules ⏳ FUTURE

- **Sprint 10+:** Chores module (backend + frontend integration)
- **Sprint 11+:** Meals module
- **Sprint 12+:** Lists module
- **Sprint 13+:** Photos module (S3/DO Spaces storage)

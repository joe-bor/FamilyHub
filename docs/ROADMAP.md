# FamilyHub Development Roadmap

**Last Updated:** December 24, 2025

## Current Status

**Phase 1B: Calendar Frontend Polish** - Sprint 4 Complete

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

**Sprint 5: PWA & Responsive**

- [ ] PWA manifest and service worker (Workbox)
- [ ] Responsive breakpoints testing (320px - 2560px)
- [ ] Touch target optimization
- [ ] Offline calendar viewing

**Sprint 6: Testing & Polish**

- [ ] Component tests (Vitest + Testing Library)
- [ ] E2E tests (Playwright)
- [ ] Performance optimization

## Phase 2: Backend Development ⏳ NEXT

**Sprint 7: Backend Setup**
- [ ] Create family-hub-api repository (Spring Boot)
- [ ] PostgreSQL database schema
- [ ] Docker containerization

**Sprint 8: Calendar API**
- [ ] REST API endpoints (events CRUD)
- [ ] Google Calendar OAuth integration
- [ ] Two-way sync (polling + webhooks)

**Sprint 9: Real-Time Sync**
- [ ] WebSocket server (Spring WebSocket)
- [ ] Frontend WebSocket integration
- [ ] Multi-device sync testing

## Phase 3: Additional Modules ⏳ FUTURE

- **Sprint 10+:** Chores module (backend + frontend integration)
- **Sprint 11+:** Meals module
- **Sprint 12+:** Lists module
- **Sprint 13+:** Photos module (S3/DO Spaces storage)

# Technical Debt & Deferred Improvements

**Last Updated:** Mar 13, 2026

This document tracks known technical debt, deferred improvements, and future enhancements identified during code reviews. Items are prioritized and linked to relevant sprints.

---

## High Priority (Address Soon)

_No high priority items at this time._

---

## Medium Priority (Future Sprint)

_No medium priority items at this time._

---

## Medium-Low Priority (Follow-up PRs)

### 1. E2E Tests for Recurring Events
**Source:** PR #117 Review
**Files:** `e2e/`
**Status:** Testing gap

**Problem:**
No E2E test coverage for the recurring events flow — creating, editing (this/all), and deleting (this/all) recurring events are only covered by unit tests.

**Suggested Fix:**
- Add E2E tests covering: create recurring event, edit single instance, edit all events, delete single instance, delete all events
- Verify RecurrencePicker interactions (frequency selection, custom days, end date)
- Verify EditScopeDialog behavior for both edit and delete actions

---

## Low Priority (Nice to Have)

### 1. Web Vitals Tracking
**Source:** Sprint 6 Performance Optimization
**Status:** Deferred - Quick Wins Only

**Description:**
Add client-side Core Web Vitals tracking (LCP, FID, CLS) for production monitoring.

**Suggested Implementation:**
- Install `web-vitals` library
- Report metrics to analytics or logging service
- Track performance trends over time

---

### 2. Production Monitoring (RUM)
**Source:** Sprint 6 Performance Optimization
**Status:** Deferred - Quick Wins Only

**Description:**
Real User Monitoring to understand actual user experience.

**Suggested Implementation:**
- Integrate Sentry Performance or similar RUM solution
- Track page load times, API latency, errors by user segment
- Set up alerting for performance regressions

---

### 3. E2E waitForTimeout Usage
**Source:** PR #38 Code Review
**Files:** `e2e/helpers/test-helpers.ts`
**Status:** Minor smell - acceptable tradeoff

**Problem:**
`waitForCalendarReady()` uses `page.waitForTimeout(100)` which is generally discouraged in Playwright (fixed waits can cause flakiness or slowness).

**Context:**
The 100ms wait allows React to settle after UI indicators are visible. This is a pragmatic tradeoff - the alternative would be finding a specific element state to wait for, which may not exist for "React finished updating" scenarios.

**If this causes issues:**
- Try removing the wait and see if tests remain stable
- Look for a specific DOM mutation or network request to wait for instead
- Consider using `page.waitForFunction()` to check React's internal state

---

### 4. Unused JavaScript
**Source:** Lighthouse CI (PR #60)
**Status:** Optimization opportunity

**Problem:**
Lighthouse detected unused JavaScript in the bundle.

**Suggested Fixes:**
- Analyze with `npm run analyze` to identify large unused modules
- Implement route-based code splitting with `React.lazy()`
- Review imports for tree-shaking opportunities
- Consider dynamic imports for heavy components (e.g., date pickers, modals)

---

### 5. PWA Optimizations
**Source:** Lighthouse CI (PR #60)
**Files:** `vite.config.ts` (vite-plugin-pwa)
**Status:** Deferred - PWA basics in place

**Current State:**
PWA is configured via `vite-plugin-pwa` but not fully optimized.

**Optimization Opportunities:**
- **Offline support**: Cache critical assets and API responses (see Backend Compatibility Notes #3)
- **Installability**: Ensure manifest meets all criteria
- **Service worker**: Implement background sync for offline mutations
- **App shell**: Cache the app shell for instant loading

**Lighthouse PWA Checklist:**
- [ ] Installable (valid manifest, service worker)
- [ ] Optimized (fast page loads, responsive)
- [ ] Network resilience (works offline/flaky network)

---

## Backend Compatibility Notes

See `.env.example` for environment variable documentation.

### Migration Checklist

**Phase 1: Family Service Layer** ✅ COMPLETED (PR #32)
- [x] Complete familyService abstraction
- [x] All family hooks use TanStack Query
- [x] Both calendar and family ready for backend

**Phase 2: Backend Implementation** ✅ COMPLETED (PRs #83, #87, #89, #96, #105, #106)
- [x] Set `VITE_API_BASE_URL` to backend URL
- [x] Implement calendar endpoints
- [x] Implement family endpoints
- [x] Remove mock API layer (#106)
- [x] E2E tests run against real backend (#105)

**Phase 3: Authentication** ✅ COMPLETED (PR #35)
- [x] Add auth system (JWT-based with mock API)
- [x] `httpClient` injects auth headers (`src/api/client/http-client.ts`)
- [x] Login screen gates unauthenticated users
- [x] Onboarding includes credentials step (username + password)
- [x] Logout clears auth state and redirects to login

### API Contracts

**Calendar Events** (ready to use):
```
GET    /calendar/events          params: startDate, endDate, memberId
GET    /calendar/events/:id
POST   /calendar/events          body: CreateEventRequest
PUT    /calendar/events/:id      body: UpdateEventRequest (no id in body)
DELETE /calendar/events/:id
```
Types: `src/lib/types/calendar.ts`

**Family** (ready to use):
```
GET    /family                   → ApiResponse<FamilyData | null>
POST   /family                   body: CreateFamilyRequest
PUT    /family                   body: UpdateFamilyRequest
DELETE /family
POST   /family/members           body: AddMemberRequest
PUT    /family/members/:id       body: UpdateMemberRequest (no id in body)
DELETE /family/members/:id
```
Types: `src/lib/types/family.ts`

### Technical Considerations

1. **Member ID Format**: Frontend uses `crypto.randomUUID()`. Backend must accept UUID v4 format without reassigning IDs.

2. **Event-Member Relationship**: ✅ Resolved — Backend uses `ON DELETE CASCADE`, so member deletion automatically removes their events.

3. **PWA API Response Caching**: Add service worker caching for API responses to enable offline functionality.
   - **Files:** `vite.config.ts` (workbox runtimeCaching)
   - **Suggested Config:**
     ```typescript
     {
       urlPattern: /\/api\/.*/,
       handler: "NetworkFirst",
       options: {
         cacheName: "api-cache",
         expiration: { maxAgeSeconds: 3600 },
         networkTimeoutSeconds: 3
       }
     }
     ```
   - This enables showing cached data when offline and falls back gracefully.

---

## Completed Items

| Item | Sprint | PR | Date |
|------|--------|----|----|
| CalendarEvent.id Null Safety (guard optimistic update comparison) | - | #118 | Mar 13, 2026 |
| Silent Avatar Upload Validation Failures (inline error messages) | - | #118 | Mar 13, 2026 |
| MemberProfileModal Component Tests (mutation payload assertions) | - | #118 | Mar 13, 2026 |
| Google Fonts Render-Blocking (self-host Nunito font) | - | #109 | Mar 13, 2026 |
| Orphaned Events Warning (BE handles via ON DELETE CASCADE) | - | - | Mar 13, 2026 |
| Lighthouse CI Integration (performance/a11y tracking in CI) | - | #60 | Feb 3, 2026 |
| Family Mutation Tests (optimistic updates, rollback, useUpdateMember, useDeleteFamily) | - | #56 | Feb 1, 2026 |
| Outdated TODO Comments in use-family.ts | - | #46 | Jan 29, 2026 |
| CI Flakiness Remediation (test helpers + documentation) | Sprint 7 | #41 | Jan 27, 2026 |
| Onboarding Registration Error Handling | Sprint 7 | #40 | Jan 26, 2026 |
| Unit Test Form Flakiness Fix (async form initialization) | Sprint 7 | #40 | Jan 26, 2026 |
| Mobile-Chrome E2E Flakiness Fix (safeClick, waitForDialogReady, z-index) | Sprint 7 | #38 | Jan 25, 2026 |
| Auth Store Test Isolation (unit + E2E test fixes) | Sprint 7 | #35 | Jan 14, 2026 |
| E2E CI Stability Improvements (timing/hydration) | Sprint 7 | #34 | Jan 8, 2026 |
| Family API Service Layer (TanStack Query migration) | Sprint 6.5 | #32 | Jan 7, 2026 |
| Test Pattern Standardization | Sprint 6 | #25 | Jan 3, 2026 |
| Data Validation on Rehydration (Zod schema) | Sprint 5 | - | Dec 27, 2025 |
| Duplicate Member Name Validation | Sprint 5 | - | Dec 27, 2025 |
| Form Accessibility (aria-describedby) | Sprint 5 | - | Dec 27, 2025 |
| localStorage Error Handling | Sprint 5 | #10 | Dec 27, 2025 |
| Remove Dead Code from AppStore | Sprint 5 | #10 | Dec 27, 2025 |
| Color Picker Code Duplication | Sprint 5 | #10 | Dec 27, 2025 |
| Touch Targets WCAG Compliance | Sprint 5 | #10 | Dec 27, 2025 |
| Selector Memoization (useFamilyMemberMap, useUnusedColors) | Sprint 5 | #10 | Dec 27, 2025 |
| Aria-labels on Icon Buttons | Sprint 5 | #10 | Dec 27, 2025 |
| Cross-Tab Synchronization | Sprint 5 | #10 | Dec 27, 2025 |
| Mobile Responsiveness (modal width, padding) | Sprint 5 | #10 | Dec 27, 2025 |

---

## How to Use This Document

### Completing Items

1. **MOVE items to Completed** — don't copy. Delete from the original section entirely.
2. **ALWAYS include the PR number** when completing items (e.g., `#60`).
3. **Use `/tech-debt close <item-name>`** to ensure the correct process is followed.

### Adding New Items

1. **Include source** — PR number, sprint, or investigation that identified the debt.
2. **List affected files** — helps future developers find the relevant code.
3. **Suggest a fix** — provide enough context for someone else to implement.
4. **Use `/tech-debt add`** to ensure proper formatting.

### Workflow Tips

- **During sprint planning:** Review this list for quick wins
- **Before major releases:** Address high priority items
- **Run `/tech-debt audit`** periodically to catch issues (duplicates, missing PRs)

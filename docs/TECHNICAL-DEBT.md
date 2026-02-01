# Technical Debt & Deferred Improvements

**Last Updated:** February 1, 2026

This document tracks known technical debt, deferred improvements, and future enhancements identified during code reviews. Items are prioritized and linked to relevant sprints.

---

## High Priority (Address Soon)

_No high priority items at this time._

---

## Medium Priority (Future Sprint)

### 1. Orphaned Events Warning
**Source:** PR #10 Review (Sprint 5)
**Files:** `src/stores/family-store.ts`, `src/components/settings/family-settings-modal.tsx`
**Status:** Deferred to Backend Integration

**Problem:**
When a member is deleted:
1. Their events become orphaned (hidden by filter but still exist)
2. No warning shown to user
3. Backend sync could fail if it validates member IDs

**Suggested Fix:**
- Count assigned events before delete
- Show confirmation dialog: "This member has X events. Delete anyway?"
- Consider cascade delete or reassignment to "Unassigned" member

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

### 2. Lighthouse CI Integration
**Source:** Sprint 6 Performance Optimization
**Status:** Deferred - Quick Wins Only

**Description:**
Automated performance budgets and regression detection in CI.

**Suggested Implementation:**
- Add `@lhci/cli` to GitHub Actions workflow
- Configure performance budgets (e.g., LCP < 2.5s, bundle size limits)
- Fail PRs that exceed budgets
- Track historical performance data

---

### 3. Production Monitoring (RUM)
**Source:** Sprint 6 Performance Optimization
**Status:** Deferred - Quick Wins Only

**Description:**
Real User Monitoring to understand actual user experience.

**Suggested Implementation:**
- Integrate Sentry Performance or similar RUM solution
- Track page load times, API latency, errors by user segment
- Set up alerting for performance regressions

---

### 4. Unit Test Form Submission Pattern
**Source:** PR #40 Investigation
**Files:** `src/components/calendar/components/event-form.test.tsx`, `src/components/calendar/calendar-module.test.tsx`
**Status:** Fixed - patterns documented in CLAUDE.md

**Problem:**
Unit tests for forms that depend on async TanStack Query data (e.g., `useFamilyMembers()`) can be flaky in CI due to race conditions between form initialization and async data resolution.

**Solution:**
See **"Async Form Testing (CI Flakiness Prevention)"** section in `CLAUDE.md` for:
- Detailed explanation of the race condition
- Required fix patterns with code examples
- Helper functions: `typeAndWait()`, `waitForMemberSelected()`, `TEST_TIMEOUTS`

**Key Distinction:**
| Test Type | Cause | Fix Location |
|-----------|-------|--------------|
| E2E (Playwright) | Browser timing, animations, network | `e2e/helpers/test-helpers.ts` |
| Unit (Vitest) | React state timing, async hooks | `src/test/test-utils.tsx` |

---

### 5. E2E waitForTimeout Usage
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

## Backend Compatibility Notes

See `.env.example` for environment variable documentation.

### Migration Checklist

**Phase 1: Family Service Layer** ✅ COMPLETED (PR #32)
- [x] Complete familyService abstraction
- [x] All family hooks use TanStack Query
- [x] Both calendar and family ready for backend

**Phase 2: Backend Implementation**
- [ ] Set `VITE_USE_MOCK_API=false` in production
- [ ] Set `VITE_API_BASE_URL` to backend URL
- [ ] Implement calendar endpoints
- [ ] Implement family endpoints

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
PATCH  /calendar/events/:id      body: UpdateEventRequest
DELETE /calendar/events/:id
```
Types: `src/lib/types/calendar.ts`

**Family** (ready to use):
```
GET    /family                   → ApiResponse<FamilyData | null>
POST   /family                   body: CreateFamilyRequest
PATCH  /family                   body: UpdateFamilyRequest
DELETE /family
POST   /family/members           body: AddMemberRequest
PATCH  /family/members/:id       body: UpdateMemberRequest
DELETE /family/members/:id
```
Types: `src/lib/types/family.ts`

### Technical Considerations

1. **Member ID Format**: Frontend uses `crypto.randomUUID()`. Backend must accept UUID v4 format without reassigning IDs.

2. **Event-Member Relationship**: Need to decide on cascade delete vs. orphan handling when members are removed. See Medium Priority #1.

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
| Family Mutation Tests (optimistic updates, rollback, useUpdateMember, useDeleteFamily) | - | - | Feb 1, 2026 |
| Outdated TODO Comments in use-family.ts | - | - | Jan 29, 2026 |
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

1. **When fixing an item:** Move it to "Completed Items" with date and PR number
2. **When adding new debt:** Include source, file(s), and suggested fix
3. **During sprint planning:** Review this list for quick wins
4. **Before major releases:** Address high priority items

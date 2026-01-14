# Technical Debt & Deferred Improvements

**Last Updated:** January 14, 2026

This document tracks known technical debt, deferred improvements, and future enhancements identified during code reviews. Items are prioritized and linked to relevant sprints.

---

## High Priority (Address Soon)

### 1. Outdated TODO Comments in use-family.ts
**Source:** PR #32 Code Review
**Files:** `src/api/hooks/use-family.ts`
**Status:** Quick fix

**Problem:**
Lines 286-287 and 437-438 contain outdated TODO comments:
```typescript
* TODO: Wire up to FamilySettingsModal "Add Member" button when UI is implemented.
* TODO: Wire up to FamilySettingsModal member deletion when UI is implemented.
```

These features ARE already wired up in `family-settings-modal.tsx`. The comments should be removed.

**Fix:** Remove the outdated TODO comments.

---

### 2. Missing Family Mutation Tests
**Source:** PR #32 Code Review
**Files:** `src/api/hooks/use-family.test.tsx`
**Status:** Should add for completeness

**Problem:**
The test file (372 lines) only tests read operations:
- ✅ Selectors tested (`useFamilyData`, `useFamilyMembers`, etc.)
- ✅ Memoization tested (`useFamilyMemberMap`, `useUnusedColors`)
- ❌ `useCreateFamily` not tested
- ❌ `useAddMember` not tested
- ❌ Optimistic updates not tested
- ❌ Rollback on error not tested

**Suggested Fix:**
Add mutation tests covering:
- Successful mutations update query cache
- Optimistic updates show immediately
- Rollback restores previous state on error
- localStorage write-through works

---

## Medium Priority (Future Sprint)

### 1. Mobile-Chrome E2E Test Flakiness
**Source:** PR #34, PR #35
**Files:** `e2e/*.spec.ts`, `playwright.config.ts`
**Status:** Tracked - intermittent failures

**Problem:**
Mobile-chrome E2E tests are flaky in CI, particularly around:
- Sticky header element interception during clicks
- Timing issues with dialog transitions
- App state transitions after registration

**Symptoms:**
- Tests pass on desktop browsers (chromium, firefox, webkit) but fail intermittently on mobile-chrome
- Element is visible but click doesn't trigger expected behavior
- Timeouts waiting for elements that should be present

**Mitigations Applied:**
- Added `force: true` for event card clicks (PR#34)
- Added explicit waits for state transitions (PR#35)
- Using `expect().toBeVisible()` with auto-retry instead of `waitFor()`

**Potential Fixes (not yet implemented):**
- Investigate sticky header z-index issues on mobile viewport
- Consider skipping mobile-chrome for specific flaky tests
- Add mobile-specific wait strategies

---

### 2. Orphaned Events Warning
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
GET    /family                   → FamilyApiResponse { data: FamilyData | null }
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

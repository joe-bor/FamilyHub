# Technical Debt & Deferred Improvements

**Last Updated:** January 6, 2026

This document tracks known technical debt, deferred improvements, and future enhancements identified during code reviews. Items are prioritized and linked to relevant sprints.

---

## High Priority (Address Soon)

### 1. Missing Family API Service Layer
**Source:** Deployment Readiness Review (Pre-Backend)
**Files:** `src/stores/family-store.ts`, `src/components/onboarding/*`, `src/components/settings/*`
**Status:** Required before backend integration

**Problem:**
Calendar events have a proper API abstraction layer, but family data does not:

```
Calendar (good pattern):
  Component → useCalendarEvents() → calendarService → USE_MOCK_API toggle
                                                    ↳ mock handlers OR httpClient

Family (missing abstraction):
  Component → useFamilyActions() → Zustand store → localStorage directly
```

This architectural inconsistency means:
1. Calendar: Just flip `VITE_USE_MOCK_API=false` and implement backend endpoints ✅
2. Family: Requires creating entire service layer + refactoring all consumers ❌

**Required Work:**

1. **Create `src/api/services/family.service.ts`**
   ```typescript
   export const familyService = {
     getFamily(): Promise<ApiResponse<FamilyData>>
     createFamily(name: string): Promise<MutationResponse<FamilyData>>
     updateFamily(updates: Partial<FamilyData>): Promise<MutationResponse<FamilyData>>
     addMember(member: CreateMemberRequest): Promise<MutationResponse<FamilyMember>>
     updateMember(id: string, updates: UpdateMemberRequest): Promise<MutationResponse<FamilyMember>>
     removeMember(id: string): Promise<void>
   }
   ```

2. **Create `src/api/mocks/family.mock.ts`**
   - Move localStorage logic from Zustand store to mock handlers
   - Mirror the pattern in `calendar.mock.ts`

3. **Create `src/api/hooks/use-family.ts`**
   ```typescript
   export const useFamily = () => useQuery(...)
   export const useCreateFamily = () => useMutation(...)
   export const useUpdateFamily = () => useMutation(...)
   export const useAddMember = () => useMutation(...)
   export const useUpdateMember = () => useMutation(...)
   export const useRemoveMember = () => useMutation(...)
   ```

4. **Refactor Zustand store**
   - Keep for UI-only state (hydration status, optimistic cache)
   - Remove direct CRUD actions that should go through API

5. **Update consumers** (grep for `useFamilyActions`, `useFamilyStore`):
   - `src/components/onboarding/family-name-step.tsx`
   - `src/components/onboarding/family-members-step.tsx`
   - `src/components/settings/family-settings-modal.tsx`
   - `src/components/settings/member-profile-modal.tsx`
   - `src/App.tsx`

**API Endpoints Required:**
- `GET    /family` - Get current family
- `POST   /family` - Create family
- `PATCH  /family` - Update family name
- `POST   /family/members` - Add member
- `PATCH  /family/members/:id` - Update member
- `DELETE /family/members/:id` - Remove member

**Estimated Scope:** Medium (1-2 days)

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

## Backend Compatibility Notes

See `.env.example` for environment variable documentation.

### Migration Checklist

**Phase 1: Family Service Layer** (do this FIRST)
- [ ] Complete High Priority item #1 (familyService abstraction)
- [ ] This unblocks all backend work

**Phase 2: Backend Implementation**
- [ ] Set `VITE_USE_MOCK_API=false` in production
- [ ] Set `VITE_API_BASE_URL` to backend URL
- [ ] Implement calendar endpoints (already abstracted)
- [ ] Implement family endpoints (after Phase 1)

**Phase 3: Authentication**
- [ ] Add auth system (JWT recommended for API)
- [ ] `httpClient` has `onUnauthorized` hook ready (`src/api/client/http-client.ts:13`)
- [ ] Add protected routes / redirect to login

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

**Family** (requires familyService first):
```
GET    /family
POST   /family                   body: { name: string }
PATCH  /family                   body: { name: string }
POST   /family/members           body: CreateMemberRequest
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

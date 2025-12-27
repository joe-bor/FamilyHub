# Technical Debt & Deferred Improvements

**Last Updated:** December 27, 2025

This document tracks known technical debt, deferred improvements, and future enhancements identified during code reviews. Items are prioritized and linked to relevant sprints.

---

## High Priority (Address Soon)

### 1. localStorage Error Handling
**Source:** PR #10 Review (Sprint 5)
**File:** `src/stores/family-store.ts`
**Status:** Deferred

**Problem:**
The Zustand persist middleware has no error handling:
- QuotaExceededError fails silently
- Disabled localStorage has no fallback
- Corrupted data has no recovery mechanism
- Failed hydration hangs the app on loading

**Suggested Fix:**
```typescript
onRehydrateStorage: () => (state, error) => {
  if (error) {
    console.error('Failed to rehydrate family store:', error);
    // Clear corrupted data or show error UI
  }
  state?.setHasHydrated(true);
},
```

---

### 2. Data Validation on Rehydration
**Source:** PR #10 Review (Sprint 5)
**File:** `src/stores/family-store.ts`
**Status:** Deferred

**Problem:**
Persisted data is not validated after loading from localStorage. If the data structure changes in a future release or gets corrupted, the app could crash.

**Suggested Fix:**
- Add Zod schema validation after hydration
- Add `version` field to storage config for migrations
- Clear invalid data and restart onboarding if validation fails

---

### 3. Remove Dead Code from AppStore
**Source:** PR #10 Review (Sprint 5)
**File:** `src/stores/app-store.ts`
**Status:** Ready to Fix

**Problem:**
`familyName` and `setFamilyName` are unused since PR #10 migrated to `family-store.ts`.

**Fix:**
Remove lines 9, 16, 23, 31 from `src/stores/app-store.ts`.

---

## Medium Priority (Future Sprint)

### 4. Cross-Tab Synchronization
**Source:** PR #10 Review (Sprint 5)
**File:** `src/stores/family-store.ts`
**Status:** Deferred to Phase 2

**Problem:**
If user opens app in 2 browser tabs, changes in one tab don't sync to the other.

**Suggested Fix:**
```typescript
// Add to family-store.ts
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === 'family-hub-family') {
      // Rehydrate store with new data
      useFamilyStore.persist.rehydrate();
    }
  });
}
```

---

### 5. Orphaned Events Warning
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

### 6. Duplicate Member Name Validation
**Source:** PR #10 Review (Sprint 5)
**File:** `src/lib/validations/family.ts`
**Status:** Deferred

**Problem:**
Users can add members with duplicate names (e.g., two "John"s).

**Suggested Fix:**
Add Zod refinement with context:
```typescript
memberFormSchema.refine(
  (data, ctx) => {
    const existingNames = ctx.existingMembers?.map(m => m.name.toLowerCase());
    return !existingNames?.includes(data.name.toLowerCase());
  },
  { message: "A member with this name already exists" }
);
```

---

### 7. Mobile Responsiveness Refinements
**Source:** PR #10 Review (Sprint 5)
**Files:** Multiple onboarding components
**Status:** Part of Sprint 5 Responsive Work

**Issues:**
- Fixed modal width on small phones (`sm:max-w-md`)
- Fixed padding (`p-6`) should be `p-4 md:p-6`
- Touch targets below WCAG 44px minimum (`h-9 w-9` = 36px)

---

## Low Priority (Nice to Have)

### 8. Color Picker Code Duplication
**Source:** PR #10 Review (Sprint 5)
**File:** `src/components/ui/color-picker.tsx`
**Status:** Minor Cleanup

**Problem:**
Colors are hardcoded in `color-picker.tsx` instead of importing from `@/lib/types/family`.

**Fix:**
```typescript
import { familyColors } from "@/lib/types/family";
// Use familyColors instead of local COLORS constant
```

---

### 9. Form Accessibility (aria-describedby)
**Source:** PR #10 Review (Sprint 5)
**Files:** All form components
**Status:** Enhancement

**Problem:**
Form error messages aren't linked to inputs via `aria-describedby`. Screen reader users won't hear validation errors when focused on inputs.

---

## Backend Compatibility Notes

These items should be addressed when integrating with the backend API:

1. **Member ID Format**: Frontend uses `crypto.randomUUID()`. Backend must accept UUID v4 format without reassigning IDs.

2. **Event-Member Relationship**: Need to decide on cascade delete vs. orphan handling when members are removed.

3. **API Contract**: Document expected endpoints for family management:
   - `POST /api/family` - Create family
   - `PUT /api/family` - Update family name
   - `POST /api/family/members` - Add member
   - `PUT /api/family/members/:id` - Update member
   - `DELETE /api/family/members/:id` - Remove member

---

## Completed Items

| Item | Sprint | PR | Date |
|------|--------|----|----|
| *None yet* | | | |

---

## How to Use This Document

1. **When fixing an item:** Move it to "Completed Items" with date and PR number
2. **When adding new debt:** Include source, file(s), and suggested fix
3. **During sprint planning:** Review this list for quick wins
4. **Before major releases:** Address high priority items

# Technical Debt & Deferred Improvements

**Last Updated:** December 27, 2025

This document tracks known technical debt, deferred improvements, and future enhancements identified during code reviews. Items are prioritized and linked to relevant sprints.

---

## High Priority (Address Soon)

### 1. Data Validation on Rehydration
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

## Medium Priority (Future Sprint)

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

### 3. Duplicate Member Name Validation
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

## Low Priority (Nice to Have)

### 4. Form Accessibility (aria-describedby)
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

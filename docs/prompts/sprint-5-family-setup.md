# Sprint 5: Family Setup & Onboarding - Planning Prompt

**Purpose:** This prompt provides context and requirements for planning the implementation of the family onboarding and settings feature. Your task is to create a detailed implementation plan.

---

## Context

FamilyHub is a family organization app (calendar, chores, meals, lists, photos). The calendar module is complete with full CRUD operations, but the app currently boots with **hardcoded demo data** - pre-loaded family members and mock events.

There is no:
- Family creation flow ("What's your family called?")
- Member management ("Who's in your family?")
- Personalized setup experience

Users open the app and immediately see "The Smith Family" calendar with fake members (Mom, Dad, Ethan, etc.). This needs to change before the app feels like a real product.

---

## Core Philosophy

**This is a shared family app, NOT a multi-user app with individual accounts.**

Think: shared tablet on the kitchen counter, or a family calendar on the fridge.
- Anyone can view, anyone can edit
- No "logging in as a specific person"
- No per-user personalization
- Settings changes apply to the whole family
- No `currentUserId` concept

When backend arrives (Phase 2), this becomes a family-level API - not individual user accounts.

---

## What We're Building

### 1. Onboarding Flow (First-Time Setup)

Three-step wizard for new users:

```
┌─────────────────────────────────────┐
│  Step 1: Welcome                    │
│                                     │
│  "FamilyHub"                        │
│  Your family's command center       │
│                                     │
│  [Get Started]                      │
└─────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────┐
│  Step 2: Name Your Family           │
│                                     │
│  "What should we call your family?" │
│  [________________________]         │
│                                     │
│  [Continue]                         │
└─────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────┐
│  Step 3: Add Members                │
│                                     │
│  "Who's in your family?"            │
│                                     │
│  ┌──────┐ ┌──────┐ ┌──────┐        │
│  │ Joe  │ │ Ana  │ │ +Add │        │
│  │  🟣  │ │  🟢  │ │      │        │
│  └──────┘ └──────┘ └──────┘        │
│                                     │
│  [Finish Setup]                     │
└─────────────────────────────────────┘
                 ↓
        Main App (Calendar)
```

### 2. Family Settings (Ongoing Management)

Accessible from the existing `SidebarMenu` component. Allows editing after initial setup:

```
┌─────────────────────────────────────┐
│  Family Settings                    │
├─────────────────────────────────────┤
│  Family Name                        │
│  [The Bor Family_______________]    │
│                                     │
│  Members                            │
│  ┌────────────────────────────────┐ │
│  │ Joe        🟣  [Edit] [Remove] │ │
│  │ Ana        🟢  [Edit] [Remove] │ │
│  └────────────────────────────────┘ │
│  [+ Add Member]                     │
│                                     │
│  ─────────────────────────────────  │
│  Danger Zone                        │
│  [Reset Family - Start Over]        │
└─────────────────────────────────────┘
```

### 3. Member Add/Edit Modal

```
┌─────────────────────────────────────┐
│  Add Member                     [X] │
├─────────────────────────────────────┤
│  Name                               │
│  [________________________]         │
│                                     │
│  Color                              │
│  ● coral  ○ teal  ○ green  ○ purple │
│  ○ yellow ○ pink  ○ orange          │
│                                     │
│  Photo (optional)                   │
│  [Upload] or drag & drop            │
│  (Future: pulled from Google)       │
│                                     │
│  [Cancel]  [Save]                   │
└─────────────────────────────────────┘
```

---

## Data Model

### localStorage Schema

```typescript
// Key: "familyhub:family"
interface FamilyData {
  id: string;                    // UUID for future backend sync
  name: string;                  // "The Bor Family"
  members: FamilyMember[];       // Dynamic, not hardcoded
  createdAt: string;             // ISO timestamp
  setupComplete: boolean;        // Has user finished onboarding?
}

interface FamilyMember {
  id: string;                    // UUID
  name: string;                  // "Joe"
  color: FamilyColor;            // "coral" | "teal" | "green" | "purple" | "yellow" | "pink" | "orange"
  avatarUrl?: string;            // Optional photo URL (data URL or future CDN)
  email?: string;                // Future: for Google Calendar integration
}

type FamilyColor = "coral" | "teal" | "green" | "purple" | "yellow" | "pink" | "orange";
```

### Migration from Hardcoded Data

Currently, family data is hardcoded in `src/lib/types/family.ts`:

```typescript
// CURRENT (hardcoded)
export const familyMembers: FamilyMember[] = [
  { id: "1", name: "Mom", color: "bg-coral" },
  { id: "2", name: "Dad", color: "bg-teal" },
  // ...
];

export const familyMemberMap: Map<string, FamilyMember> = new Map(...);
```

This needs to become **dynamic**, pulled from localStorage (and eventually from API).

---

## Technical Requirements

### Patterns to Follow

The codebase has established patterns. Follow them:

1. **State Management:** Zustand for UI state
   - See: `src/stores/app-store.ts`, `src/stores/calendar-store.ts`
   - Create a new `family-store.ts` for family state

2. **Form Validation:** react-hook-form + Zod
   - See: `src/lib/validations/calendar.ts`
   - See: `src/components/calendar/components/event-form.tsx`

3. **UI Components:** Use existing primitives
   - `Button`, `Input`, `Label` from `src/components/ui/`
   - `Dialog` for modals
   - Follow the color pill pattern from `MemberSelector`

4. **Types:** Centralize in `src/lib/types/`
   - Update `family.ts` to export dynamic types, not hardcoded data

5. **Color System:** Use existing `colorMap` for consistent styling
   - 7 colors: coral, teal, green, purple, yellow, pink, orange
   - Each has `bg`, `text`, and `light` variants

### Files That Will Change

**New Files (likely):**
- `src/stores/family-store.ts` - Family state + localStorage persistence
- `src/lib/validations/family.ts` - Zod schemas for family/member forms
- `src/components/onboarding/` - Onboarding flow components
- `src/components/ui/color-picker.tsx` - Color selection component
- `src/components/settings/` - Family settings components (or integrate into sidebar)

**Modified Files:**
- `src/lib/types/family.ts` - Remove hardcoded data, keep types
- `src/stores/app-store.ts` - `familyName` becomes derived from family store
- `src/components/shared/sidebar-menu.tsx` - Add settings UI, use dynamic members
- `src/components/ui/member-selector.tsx` - Use dynamic family members
- `src/components/calendar/components/event-form.tsx` - Use dynamic members
- `src/App.tsx` - Check `setupComplete`, show onboarding or main app

### App Entry Logic

```typescript
// Pseudocode for App.tsx
function App() {
  const { family, isLoading } = useFamilyStore();

  if (isLoading) return <LoadingScreen />;

  if (!family || !family.setupComplete) {
    return <OnboardingFlow />;
  }

  return <MainApp />;
}
```

---

## Constraints & Non-Goals

### Do NOT:
- Add authentication or user accounts
- Add "current user" or per-user personalization
- Create individual login flows
- Add backend API calls (localStorage only for now)
- Build offline data sync (deferred to Phase 2)
- Over-engineer - keep it simple

### Defer to Future:
- Avatar photo upload (stub the UI, implement later)
- Email field for Google Calendar (include in type, hide in UI for now)
- Backend persistence (localStorage is the source of truth for Sprint 5)

---

## Acceptance Criteria

### Onboarding Flow
- [ ] First-time users see onboarding, not the calendar
- [ ] Users can enter a family name (required, 1-50 chars)
- [ ] Users can add at least one family member (required)
- [ ] Each member has a name (required) and color (from 7-color palette)
- [ ] Completing setup persists to localStorage and shows main app
- [ ] Returning users skip onboarding and see their family data

### Family Settings
- [ ] Accessible from sidebar menu
- [ ] Can edit family name
- [ ] Can view list of members
- [ ] Can add new members
- [ ] Can edit existing member (name, color)
- [ ] Can remove members (with confirmation)
- [ ] Can reset family (with confirmation) - clears localStorage, restarts onboarding

### Integration
- [ ] Calendar event forms use dynamic family members
- [ ] Family filter pills use dynamic members
- [ ] Sidebar shows dynamic family members
- [ ] App header shows dynamic family name
- [ ] Existing calendar events remain functional after migration

### Responsive Design
- [ ] Onboarding screens work on mobile (320px+)
- [ ] Settings UI works on mobile
- [ ] Touch targets are at least 48px

---

## Reference Files

Read these to understand existing patterns:

| Pattern | File |
|---------|------|
| Zustand store | `src/stores/app-store.ts`, `src/stores/calendar-store.ts` |
| Form validation | `src/lib/validations/calendar.ts` |
| Form component | `src/components/calendar/components/event-form.tsx` |
| Color system | `src/lib/types/family.ts` (colorMap) |
| Member UI | `src/components/ui/member-selector.tsx` |
| Sidebar | `src/components/shared/sidebar-menu.tsx` |
| App entry | `src/App.tsx` |
| Dialog pattern | `src/components/calendar/components/event-form-modal.tsx` |

---

## Deliverable

Create an implementation plan that:

1. Breaks down the work into logical, ordered tasks
2. Identifies which files to create/modify for each task
3. Considers the migration path from hardcoded to dynamic data
4. Ensures existing functionality (calendar CRUD) keeps working
5. Addresses mobile-first responsive design

The plan should be detailed enough that implementation can proceed without ambiguity.

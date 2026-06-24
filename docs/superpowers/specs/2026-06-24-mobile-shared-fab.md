# Spec — Standardize mobile module creation on a shared floating add button

- **Issue:** [#251](https://github.com/joe-bor/FamilyHub/issues/251)
- **Date:** 2026-06-24
- **Status:** Approved (issue body is the canonical design intent)

## Problem

On mobile, the primary "create something here" action looks and sits differently in
every module:

- **Calendar** — a prominent floating `+` near the thumb area.
- **Lists** — a "New List" button in a content row (landing) and an "Add item" button
  inside the list header card (detail).
- **Chores** — a small icon button beside the scope switcher.
- **Recipes** — an "Add recipe" button in an otherwise-redundant row beneath the header.

These inline header/row actions consume prime vertical space and make the same primary
action feel inconsistent as the user moves around the app.

## Decision

On mobile, standardize Lists, Chores, and Recipes on the same floating `+` treatment
Calendar already uses. Placement, size, bottom-nav clearance, safe-area handling,
z-index, press feedback, and haptics are **shared** rather than copied. The action
itself stays module/context-specific.

Desktop keeps its existing inline/header actions unchanged. Meals is intentionally
excluded (meal creation starts from a specific day/type slot, so a global `+` has no
clear target).

## Current-state facts (grounding)

- `AddEventButton` (`src/components/calendar/components/add-event-button.tsx`) is the
  existing FAB. It renders a `<Button size="icon">` fixed at `right-8 z-40`, `w-14 h-14
  rounded-full`, choosing a mobile vs desktop `bottom` offset via `useIsMobile`.
- Layout tokens live in `src/components/calendar/components/floating-action-layout.ts`:
  `MOBILE_FAB_BOTTOM_OFFSET` (FAB position) and `MOBILE_FAB_SCROLL_PADDING` (per-view
  scroll padding). The four calendar mobile views import the padding token; the FAB
  imports the offset token.
- `Button` (`src/components/ui/button.tsx`) already wires `usePressable`, which provides
  the press scale + tint overlay **and** `haptics.tap()`. Anything built on `Button`
  inherits press feedback and optional haptics for free.
- `AddEventButton` is consumed by both `calendar-module.tsx` and `home-dashboard.tsx`.
- Each module view owns its own `flex-1 overflow-y-auto` scroll container and its own
  create-sheet/modal state. The mobile bottom nav (`mobile-bottom-nav.tsx`) is a
  sibling of `<main>` in the app shell; the FAB is `position: fixed` and floats above.
- Module nesting that the FAB must respect:
  - **Lists** swaps its body between a landing grid and `ListDetailView` based on
    `selectedListId`. Only one is mounted at a time.
  - **Recipes** swaps between the library and a detail view based on `selectedRecipeId`.
  - **Chores** has no nested detail; creation is gated by `canCreate`
    (`Boolean(activeFrom) && !isLoading && !isError`).

## Architecture

### 1. Shared presentational FAB

`src/components/shared/floating-action-button.tsx`, barrel-exported from
`@/components/shared`:

```ts
interface FloatingActionButtonProps {
  onClick: () => void;
  label: string;            // accessible name → aria-label
  icon?: LucideIcon;        // default Plus
  disabled?: boolean;       // module-specific gating
}
```

Owns **only** presentation/layout:

- `fixed right-8 z-40`, `w-14 h-14 rounded-full`, shadow, primary background.
- Mobile vs desktop `bottom` offset via `useIsMobile` + the shared offset token
  (identical math to today's `AddEventButton`).
- Renders `<Button size="icon" aria-label={label} disabled={disabled}>` so press
  feedback + haptics are inherited.

It does **not** decide *whether* to render or *which* action to run — modules own that.

### 2. Shared layout tokens

Move `MOBILE_FAB_BOTTOM_OFFSET` and `MOBILE_FAB_SCROLL_PADDING` to
`src/components/shared/floating-action-layout.ts`. The existing
`src/components/calendar/components/floating-action-layout.ts` becomes a one-line
re-export from the shared module, so Calendar's five existing import sites and its test
keep working with no behavior change.

### 3. Calendar / Home compatibility

Refactor `AddEventButton` to render
`<FloatingActionButton label="Add event" onClick={onClick} />`. Call sites in
`calendar-module.tsx` and `home-dashboard.tsx` are untouched, and
`add-event-button.test.tsx` continues to pass (same DOM/styles) — proving no regression.

### 4. Per-module migration (mobile only)

Each module renders the shared FAB on mobile and removes its inline/header action on
mobile, keeping the desktop action as-is. The FAB is rendered by the view that owns the
relevant action state, never by the app shell.

| Surface | File | FAB label | Removed on mobile (kept on desktop) |
|---|---|---|---|
| Lists landing | `lists-view.tsx` | **Create list** | the top "New List" button row |
| List detail | `lists/list-detail-view.tsx` | **Add item** | header-card "Add item" button (keep options ⚙) |
| Chores | `chores-view.tsx` | **Add recurring chore** | the `+` icon button beside the scope switcher |
| Recipes library | `recipes-view.tsx` | **Add recipe** | the action row beneath the header |
| Recipe detail | `recipes-view.tsx` | _(none)_ | — gated by `selectedRecipeId === null` |

Notes:

- **Lists landing** renders the FAB only when no list is selected. **List detail**
  renders its own "Add item" FAB; since the views are mutually exclusive, exactly one
  Lists FAB is mounted at a time.
- **Chores** FAB carries `disabled={!canCreate}`; the disabled state keeps its
  accessible name. Disabled/read-only/loading rules stay module-specific.
- **Recipes** renders the FAB only in the library (`selectedRecipeId === null`), so
  recipe detail shows none.
- Empty-state CTAs ("Create first list", "Add your first recipe") are **retained** —
  they are contextual onboarding inside the content area, not the header row the issue
  targets.

### 5. Content clearance

Each migrated mobile scroll container gets
`paddingBottom: isMobile ? MOBILE_FAB_SCROLL_PADDING : undefined` so the final
interactive content clears the FAB and the bottom nav. Desktop is unaffected (Lists,
Chores, Recipes have no desktop FAB).

## Testing

- **Unit** — `floating-action-button.test.tsx`: renders with `aria-label`, fires
  `onClick`, mobile vs desktop `bottom` offset, respects `disabled`.
- **Existing** — `add-event-button.test.tsx` stays green (regression guard).
- **Component** — per module: mobile shows the FAB with the correct label; the old
  inline/header action is gone on mobile; desktop still shows its inline action; context
  switches behave (Lists landing vs detail label; recipe detail shows no FAB; chores FAB
  disabled when `!canCreate`).
- **E2E (mobile)** — opening each creation flow from its FAB; lower-content tap
  clearance (last list/chore/recipe row remains tappable, not obscured by FAB/nav).

## Out of scope

- Desktop layouts and their existing creation buttons.
- Meals creation.
- Any change to the create sheets/modals themselves or their submission logic.

## Acceptance (from the issue)

All issue acceptance checkboxes map to the above: shared FAB for Lists landing/detail,
Chores, Recipes with context-specific labels; inline actions removed on mobile; Calendar
migrated with no regression; FAB clears bottom nav + safe area at all mobile widths;
scroll padding prevents obscured content; module-specific disabled rules communicated
accessibly; ≥44px target, press feedback, optional haptics; desktop unchanged; component
+ E2E coverage.

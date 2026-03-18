# Mobile Calendar Redesign — Design Spec

**Date:** 2026-03-18
**Scope:** Calendar module mobile experience — 4 views, event CRUD, navigation/toolbar
**Approach:** Mobile-first rebuild with separate mobile rendering paths. Desktop untouched.

---

## Problem Statement

The calendar views were built desktop-first and retrofitted for mobile. This results in:

- **Weekly view** forces a 640px min-width with horizontal scroll on phones
- **Daily view** has hardcoded 80px/hr rows creating excessive scroll, and fixed margins that waste viewport space
- **Monthly view** tries to squeeze event text into 60px cells instead of showing dot indicators
- **Event forms** use centered modals that get cut off on mobile, with no scroll for time selection
- **Toolbar** consumes 3 rows of chrome before any calendar content appears

The mobile experience feels like a prototype, not a production app.

## Design Direction

- **Apple Calendar-level polish** — spacious, gesture-friendly, native feel
- **Family identity via color and filtering** — member colors on events, easy per-member filtering. No swimlanes (too cramped on mobile).
- **Visual identity preserved** — cream background (`oklch(0.98 0.01 85)`), purple primary (`oklch(0.55 0.18 285)`), Nunito font, 7 member colors. Refine spacing, type hierarchy, and color cohesion.

## Out of Scope

- Desktop layout changes
- Home dashboard redesign
- Non-calendar modules (chores, meals, lists, photos)
- New features (notifications, drag-to-create, pinch-to-zoom)
- Typography or color system overhaul (refine, not replace)

---

## 1. Mobile Calendar Views

All views get separate mobile rendering paths (conditional on `useIsMobile()` hook at the 640px breakpoint). Desktop components remain unchanged.

### 1.1 Daily View

**Current issues:** 80px/hr rows create 1280px scroll for a 16-hour day; hardcoded 8px/12px event margins waste space on 375px screens; no swipe navigation.

**Proposed mobile layout:**

- **Time column:** 32px wide (down from 48px), `text-xs` labels, only show labels on even hours to reduce noise
- **Row height:** 60px per hour (down from 80px), reducing total scroll to ~960px for 16 hours
- **Event cards:**
  - 44px minimum touch target height
  - Member-colored left border (3px, existing pattern)
  - Title (semibold, 13px) + time (regular, 11px, muted)
  - Margins scale to 4px on mobile (down from 8px/12px)
  - Max 2 overlapping columns on mobile (down from 3)
- **Swipe navigation:** Swipe left/right to change days. Date in header updates. Use CSS `touch-action: pan-y` on the time grid to allow vertical scroll while capturing horizontal swipe.
- **Auto-scroll:** Scroll to current time minus 1 hour on initial load (existing behavior, keep it)
- **Current time indicator:** Keep existing red line with dot

### 1.2 Weekly View

**Current issues:** `min-w-[640px]` forces horizontal scroll; 64px time column wastes 17% of 375px viewport; 7 narrow columns make events unreadable.

**Proposed mobile layout — complete rethink (list-based, not grid-based):**

- **Week date strip (header):**
  - 7-column grid showing day initial (S M T W T F S) + date number
  - Today highlighted with purple circle background
  - Days with events show small colored dots below the date number
  - Tapping a day scrolls to that day's section in the list below
- **Day-by-day event list:**
  - Each day is a section: day label (left, `min-w-28px`, day-of-week abbreviation + date number) + event list (right)
  - Events shown as compact rows: member-colored dot (6px) + title + time (right-aligned, muted)
  - Today section gets subtle purple background accent
  - Tapping an event opens the event detail sheet
  - Tapping a day label jumps to the daily view for that day
- **Swipe navigation:** Swipe left/right to change weeks
- **Empty days:** Show day label with "No events" in muted text, or collapse to single line

**Desktop:** Keeps the existing 7-column time grid unchanged.

### 1.3 Monthly View

**Current issues:** Tries to show event text in tiny 60px cells; member indicator dots (12px) are oversized; wasted vertical space.

**Proposed mobile layout (Apple Calendar pattern — grid + list split):**

- **Compact calendar grid (top section):**
  - 7-column grid with day initials header row
  - Each cell: date number + up to 3 member-colored dots (4px diameter) below
  - Today highlighted with purple circle
  - Selected day gets a subtle purple ring/background
  - Cell height: ~44px (touch target compliant)
  - No event text in cells — dots only
- **Selected day event list (bottom section):**
  - Appears below the grid when a day is tapped
  - Header: "Wednesday, Mar 18" (full date, semibold)
  - Event rows: member-colored left border (3px) + title + time range
  - Tapping an event opens the event detail sheet
  - If no events: "No events" message with subtle add-event prompt
- **Swipe navigation:** Swipe left/right on the calendar grid to change months
- **Default selection:** Today is selected on load

**Desktop:** Keeps the existing cell-based layout with event text.

### 1.4 Schedule View

**Current issues:** Fixed 16px container padding wastes space; no member indicator on events; `p-3` event card padding doesn't scale; icon sizes too small.

**Proposed refinements (same structure, polished):**

- **Container padding:** 12px on mobile (down from 16px)
- **Event card padding:** 10px on mobile (down from 12px)
- **Member identity:** Add member avatar initial (24px circle, member color background, white initial letter) on the right side of each event card
- **Event card layout:** Color bar (4px, left) + content (title 13px semibold, time 11px muted) + member avatar (right)
- **Sticky date headers:** Already sticky (`top-0 z-10`), refine styling — use subtle background tint, bolder date text
- **Touch targets:** Event cards minimum 48px height
- **Date header format:** "Today — Wed, Mar 18" for today, "Tomorrow — Thu, Mar 19" for tomorrow, then "Friday, Mar 20" etc.

---

## 2. Event Forms — Full-Screen Sheets

Replace centered modal dialogs with full-screen sheets on mobile.

### 2.1 Implementation Pattern

- On mobile (`useIsMobile()`): Render form as a full-screen overlay (`fixed inset-0 z-50 bg-card`)
- On desktop: Keep existing `Dialog` modal (no changes)
- Transition: Slide up from bottom with `translate-y` animation (200ms ease-out)

### 2.2 Create Event Form

**Header:** Fixed top bar with Cancel (left, text button, purple) / "New Event" (center, bold) / Add (right, purple filled button)

**Form layout (top to bottom):**

1. **Event name** — Large input (18px, semibold), no border, bottom accent line (2px purple). Autofocus on open.
2. **All-day toggle** — Label + switch control, row with bottom border
3. **Date/time section:**
   - "Starts" row: label (left) + date chip + time chip (right)
   - "Ends" row: label (left) + date chip + time chip (right)
   - Chips are tappable (purple tint background when active)
   - Tapping date chip opens the existing `DatePicker` component in a bottom-aligned popover
   - Tapping time chip opens the existing `TimePicker` scroll-wheel in a bottom-aligned popover
   - Smart defaults from `getSmartDefaultTimes()` (existing utility)
4. **Recurrence** — Row with repeat icon + "Repeat" label + current value with chevron (right)
5. **Family member selector** — Section label ("Family Member") + horizontal pill buttons (44px height). Selected member shows in their color with white text; unselected are neutral gray.
6. **Location** — Icon + text input, single row
7. **Notes** — Icon + text input, expandable

**Scroll:** Entire form body scrollable. Header stays fixed.

### 2.3 Edit Event Form

Same layout as create form with:
- Header: Cancel / "Edit Event" / Save
- Fields pre-populated with existing event data
- Delete button at the bottom of the form (destructive style, separated by spacing)

### 2.4 Event Detail View

**Header section (member-colored):**
- Gradient background using the event's member color
- Back button (left, white) + Edit / Delete buttons (right, semi-transparent white background)
- Event title (22px, bold, white)
- Member avatar initial + member name (white, slightly transparent)

**Detail rows (white background):**
- Each row: icon (20px, member color) + content
- Date & time: Full date on line 1, time range on line 2
- Recurrence: Pattern description (e.g., "Every week on Wednesday")
- Location: Name on line 1, address on line 2 (if available)
- Notes: Multi-line text

**Rows only shown if data exists** — no empty "Add location" prompts on the detail view.

---

## 3. Mobile Toolbar — Compact 2-Row Layout

Replace the current 3-row toolbar (view switcher + filter pills + date navigation) with a compact 2-row design.

### 3.1 Row 1: Header Bar

- **Left:** Current context label — "March 2026" (monthly), "Mar 16 – 22" (weekly), "Wed, Mar 18" (daily), "Upcoming" (schedule). Bold, 16px.
- **Right:** "Today" text button (purple, highlighted when navigated away from today) + hamburger menu icon

### 3.2 Row 2: Controls Bar

- **Left:** View switcher — 4 letter pills in a segmented control: D / W / M / S. Active view gets purple fill. Compact: ~120px total width.
- **Right:** Member filter dots — circular color dots (24px). Filled = included in filter. Ring outline (2px border, hollow center) = excluded. Tap to toggle. Horizontally scrollable if many members.

### 3.3 Date Navigation

- **No arrow buttons on mobile** — swipe gestures handle all date navigation
- Schedule view uses natural vertical scroll (no date swipe needed)
- "Today" button in header is the escape hatch to return to current date

### 3.4 FAB (Add Event Button)

- Keep existing: fixed bottom-right, 56px diameter, purple, z-40
- Add safe area padding for notched phones: `pb-safe` or `bottom: max(2rem, env(safe-area-inset-bottom) + 1rem)`

---

## 4. Interaction Patterns

### 4.1 Swipe Navigation

| View | Swipe Direction | Action |
|------|----------------|--------|
| Daily | Left/Right | Previous/Next day |
| Weekly | Left/Right | Previous/Next week |
| Monthly | Left/Right (on grid) | Previous/Next month |
| Schedule | Vertical scroll | Natural infinite scroll |

**Implementation:** Use touch event handlers (`touchstart`, `touchmove`, `touchend`) with a minimum 50px horizontal threshold to distinguish from vertical scroll. Apply `touch-action: pan-y` on swipeable containers.

### 4.2 Tap Targets

All interactive elements must meet 44x44px minimum touch target (Apple HIG). This applies to:
- Event cards in all views
- View switcher pills
- Member filter dots (24px visible, 44px tap area via padding)
- Date cells in monthly grid
- Day labels in weekly list
- Form inputs and buttons

### 4.3 Transitions

- **View switching:** Cross-fade (150ms) between views
- **Form open:** Slide up from bottom (200ms ease-out)
- **Form close:** Slide down (150ms ease-in)
- **Date swipe:** Slide left/right with the swipe gesture, snap to next/previous
- **Respect `prefers-reduced-motion`:** All animations disabled when set to "reduce" (existing Playwright config already sets this)

---

## 5. Component Architecture

### 5.1 New Components

| Component | Purpose |
|-----------|---------|
| `MobileDailyView` | Mobile-specific daily calendar with swipe support |
| `MobileWeeklyView` | List-based weekly view with date strip header |
| `MobileMonthlyView` | Dot-grid + selected day event list |
| `MobileEventSheet` | Full-screen sheet wrapper for forms on mobile |
| `MobileToolbar` | Compact 2-row toolbar with view switcher + member filters |
| `SwipeContainer` | Reusable swipe gesture handler for date navigation |
| `MemberAvatar` | Small circular avatar with initial + member color (reusable) |

### 5.2 Modified Components

| Component | Changes |
|-----------|---------|
| `CalendarModule` | Conditional rendering: mobile vs desktop view components |
| `ScheduleCalendar` | Add `MemberAvatar`, adjust spacing/padding for mobile |
| `EventFormModal` | On mobile: render `MobileEventSheet` instead of `Dialog` |
| `EventDetailModal` | On mobile: render full-screen detail with colored header |
| `AddEventButton` | Add safe-area-inset padding for notched phones |
| `CalendarNavigation` | Hide on mobile (replaced by swipe + header) |

### 5.3 Shared Components (Used by Both Mobile & Desktop)

| Component | Usage |
|-----------|-------|
| `CalendarEventCard` | Rendered inside both mobile and desktop views (may need a `mobile` variant) |
| `EventForm` | The form itself is shared; only the wrapper changes (Dialog vs MobileEventSheet) |
| `FamilyFilterPills` | Redesigned as dots on mobile, pills on desktop |
| `CalendarViewSwitcher` | Letter pills on mobile, full labels on desktop |
| `TimePicker` | Reused as-is inside mobile form |
| `DatePicker` | Reused as-is inside mobile form |

### 5.4 File Organization

New mobile components go in `src/components/calendar/views/mobile/` to keep the existing desktop views untouched:

```
src/components/calendar/
├── views/
│   ├── daily-calendar.tsx          # Desktop (unchanged)
│   ├── weekly-calendar.tsx         # Desktop (unchanged)
│   ├── monthly-calendar.tsx        # Desktop (unchanged)
│   ├── schedule-calendar.tsx       # Shared (responsive refinements)
│   └── mobile/
│       ├── mobile-daily-view.tsx
│       ├── mobile-weekly-view.tsx
│       ├── mobile-monthly-view.tsx
│       └── swipe-container.tsx
├── components/
│   ├── mobile-event-sheet.tsx
│   ├── mobile-toolbar.tsx
│   ├── member-avatar.tsx
│   └── ... (existing components)
```

---

## 6. Breakpoint Strategy

Single breakpoint: **640px** (`sm:` in Tailwind, matching the existing `useIsMobile()` hook).

- `< 640px`: Mobile rendering path (new mobile components)
- `≥ 640px`: Desktop rendering path (existing components, unchanged)

No intermediate tablet breakpoint for this iteration. Tablets get the desktop experience.

---

## 7. Testing Strategy

### Unit Tests
- Each new mobile component gets its own test file
- Test responsive branching in `CalendarModule` (mock `useIsMobile()`)
- Test swipe gesture handler thresholds and direction detection
- Test member filter dot toggle behavior

### E2E Tests
- Mobile Chrome project in Playwright (already configured)
- Test all 4 mobile views render correctly
- Test swipe navigation changes dates
- Test event creation via full-screen sheet
- Test event detail view opens with correct member color
- Test member filter toggling
- Test FAB positioning doesn't overlap content

### Visual Regression (Future)
- Not in scope for this iteration, but the mobile component separation makes it easy to add later

---

## 8. Acceptance Criteria

1. All 4 calendar views have purpose-built mobile layouts at `< 640px`
2. No horizontal scrolling on any view at 375px viewport width
3. All interactive elements meet 44px minimum touch target
4. Event creation/editing uses full-screen sheet on mobile (no cut-off modals)
5. Swipe left/right navigates dates on daily, weekly, and monthly views
6. Member identity (color + initial) visible on every event card
7. Toolbar consumes maximum 2 rows before calendar content begins
8. All existing desktop layouts remain unchanged
9. All existing E2E tests continue to pass
10. New E2E tests cover mobile-specific interactions

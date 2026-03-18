# Mobile Calendar Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild all 4 calendar views with purpose-built mobile layouts, full-screen event sheets, a compact toolbar, and swipe navigation.

**Architecture:** Separate mobile rendering paths branching at `useIsMobile()` (640px). New mobile components live in `src/components/calendar/views/mobile/` and `src/components/calendar/components/`. Desktop components remain untouched. A shared `SwipeContainer` handles touch gesture navigation across views.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, Zustand, TanStack Query, react-hook-form, Zod, Radix UI, lucide-react

**Spec:** `docs/superpowers/specs/2026-03-18-mobile-calendar-redesign.md`

---

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `src/components/calendar/views/mobile/swipe-container.tsx` | Reusable touch gesture handler (50px threshold, 20px edge exclusion) |
| `src/components/calendar/views/mobile/swipe-container.test.tsx` | Unit tests for swipe gesture logic |
| `src/components/calendar/views/mobile/mobile-daily-view.tsx` | Mobile daily calendar — 60px/hr rows, 32px time column, swipe between days |
| `src/components/calendar/views/mobile/mobile-daily-view.test.tsx` | Unit tests |
| `src/components/calendar/views/mobile/mobile-weekly-view.tsx` | Mobile weekly — date strip header + day-by-day event list |
| `src/components/calendar/views/mobile/mobile-weekly-view.test.tsx` | Unit tests |
| `src/components/calendar/views/mobile/mobile-monthly-view.tsx` | Mobile monthly — dot grid + selected day event list |
| `src/components/calendar/views/mobile/mobile-monthly-view.test.tsx` | Unit tests |
| `src/components/calendar/views/mobile/index.ts` | Barrel exports for mobile views |
| `src/components/calendar/components/member-avatar.tsx` | Circular avatar with initial + member color (24px default) |
| `src/components/calendar/components/member-avatar.test.tsx` | Unit tests |
| `src/components/calendar/components/mobile-toolbar.tsx` | Compact 2-row toolbar: context label + Today/menu, view switcher + member filter dots |
| `src/components/calendar/components/mobile-toolbar.test.tsx` | Unit tests |
| `src/components/calendar/components/mobile-event-sheet.tsx` | Full-screen sheet wrapper for forms on mobile |
| `src/components/calendar/components/mobile-event-sheet.test.tsx` | Unit tests |
| `src/components/calendar/components/mobile-event-detail.tsx` | Full-screen event detail with colored member header |
| `src/components/calendar/components/mobile-event-detail.test.tsx` | Unit tests |

### Modified Files

| File | Changes |
|------|---------|
| `src/components/calendar/calendar-module.tsx` | Add `useIsMobile()` branching: render `MobileToolbar` + mobile views on mobile, existing components on desktop |
| `src/components/calendar/views/schedule-calendar.tsx` | Add `MemberAvatar` to event cards, adjust spacing for mobile, update date header format |
| `src/components/calendar/components/event-form-modal.tsx` | On mobile: render `MobileEventSheet` instead of `Dialog` |
| `src/components/calendar/components/event-detail-modal.tsx` | On mobile: render `MobileEventDetail` instead of `Dialog` |
| `src/components/calendar/components/add-event-button.tsx` | Add `env(safe-area-inset-bottom)` for notched phones |
| `src/App.tsx` | Hide `AppHeader` on mobile when calendar module is active |
| `src/components/calendar/index.ts` | Add exports for new mobile components |
| `src/components/calendar/views/index.ts` | Add exports for mobile views barrel |

---

## Task 1: SwipeContainer — Reusable Gesture Handler

**Files:**
- Create: `src/components/calendar/views/mobile/swipe-container.tsx`
- Create: `src/components/calendar/views/mobile/swipe-container.test.tsx`

This is the foundation — every mobile view wraps its content in `SwipeContainer` for date navigation.

- [ ] **Step 1: Write failing tests for SwipeContainer**

```tsx
// src/components/calendar/views/mobile/swipe-container.test.tsx
import { render, screen, fireEvent } from "@/test/test-utils";
import { SwipeContainer } from "./swipe-container";

describe("SwipeContainer", () => {
  it("renders children", () => {
    render(
      <SwipeContainer onSwipeLeft={vi.fn()} onSwipeRight={vi.fn()}>
        <div>content</div>
      </SwipeContainer>,
    );
    expect(screen.getByText("content")).toBeInTheDocument();
  });

  it("calls onSwipeLeft when swiping left beyond threshold", () => {
    const onSwipeLeft = vi.fn();
    const { container } = render(
      <SwipeContainer onSwipeLeft={onSwipeLeft} onSwipeRight={vi.fn()}>
        <div>content</div>
      </SwipeContainer>,
    );
    const el = container.firstChild as HTMLElement;

    fireEvent.touchStart(el, {
      touches: [{ clientX: 200, clientY: 300 }],
    });
    fireEvent.touchEnd(el, {
      changedTouches: [{ clientX: 100, clientY: 305 }],
    });

    expect(onSwipeLeft).toHaveBeenCalledOnce();
  });

  it("calls onSwipeRight when swiping right beyond threshold", () => {
    const onSwipeRight = vi.fn();
    const { container } = render(
      <SwipeContainer onSwipeLeft={vi.fn()} onSwipeRight={onSwipeRight}>
        <div>content</div>
      </SwipeContainer>,
    );
    const el = container.firstChild as HTMLElement;

    fireEvent.touchStart(el, {
      touches: [{ clientX: 100, clientY: 300 }],
    });
    fireEvent.touchEnd(el, {
      changedTouches: [{ clientX: 200, clientY: 305 }],
    });

    expect(onSwipeRight).toHaveBeenCalledOnce();
  });

  it("ignores swipes shorter than 50px threshold", () => {
    const onSwipeLeft = vi.fn();
    const { container } = render(
      <SwipeContainer onSwipeLeft={onSwipeLeft} onSwipeRight={vi.fn()}>
        <div>content</div>
      </SwipeContainer>,
    );
    const el = container.firstChild as HTMLElement;

    fireEvent.touchStart(el, {
      touches: [{ clientX: 200, clientY: 300 }],
    });
    fireEvent.touchEnd(el, {
      changedTouches: [{ clientX: 170, clientY: 305 }],
    });

    expect(onSwipeLeft).not.toHaveBeenCalled();
  });

  it("ignores swipes starting within 20px of left screen edge", () => {
    const onSwipeRight = vi.fn();
    const { container } = render(
      <SwipeContainer onSwipeLeft={vi.fn()} onSwipeRight={onSwipeRight}>
        <div>content</div>
      </SwipeContainer>,
    );
    const el = container.firstChild as HTMLElement;

    fireEvent.touchStart(el, {
      touches: [{ clientX: 10, clientY: 300 }],
    });
    fireEvent.touchEnd(el, {
      changedTouches: [{ clientX: 150, clientY: 305 }],
    });

    expect(onSwipeRight).not.toHaveBeenCalled();
  });

  it("ignores swipes starting within 20px of right screen edge", () => {
    const onSwipeLeft = vi.fn();
    // window.innerWidth defaults to 1024 in jsdom
    const { container } = render(
      <SwipeContainer onSwipeLeft={onSwipeLeft} onSwipeRight={vi.fn()}>
        <div>content</div>
      </SwipeContainer>,
    );
    const el = container.firstChild as HTMLElement;

    fireEvent.touchStart(el, {
      touches: [{ clientX: 1015, clientY: 300 }],
    });
    fireEvent.touchEnd(el, {
      changedTouches: [{ clientX: 900, clientY: 305 }],
    });

    expect(onSwipeLeft).not.toHaveBeenCalled();
  });

  it("ignores vertical swipes (deltaY > deltaX)", () => {
    const onSwipeLeft = vi.fn();
    const { container } = render(
      <SwipeContainer onSwipeLeft={onSwipeLeft} onSwipeRight={vi.fn()}>
        <div>content</div>
      </SwipeContainer>,
    );
    const el = container.firstChild as HTMLElement;

    fireEvent.touchStart(el, {
      touches: [{ clientX: 200, clientY: 100 }],
    });
    fireEvent.touchEnd(el, {
      changedTouches: [{ clientX: 130, clientY: 300 }],
    });

    expect(onSwipeLeft).not.toHaveBeenCalled();
  });

  it("applies touch-action: pan-y style", () => {
    const { container } = render(
      <SwipeContainer onSwipeLeft={vi.fn()} onSwipeRight={vi.fn()}>
        <div>content</div>
      </SwipeContainer>,
    );
    expect(container.firstChild).toHaveStyle({ touchAction: "pan-y" });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/calendar/views/mobile/swipe-container.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Implement SwipeContainer**

```tsx
// src/components/calendar/views/mobile/swipe-container.tsx
import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const SWIPE_THRESHOLD = 50;
const EDGE_ZONE = 20;

interface SwipeContainerProps {
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  children: ReactNode;
  className?: string;
}

export function SwipeContainer({
  onSwipeLeft,
  onSwipeRight,
  children,
  className,
}: SwipeContainerProps) {
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  function handleTouchStart(e: React.TouchEvent) {
    const touch = e.touches[0];
    const x = touch.clientX;

    // Edge-zone exclusion: ignore swipes near screen edges
    if (x < EDGE_ZONE || x > window.innerWidth - EDGE_ZONE) {
      touchStart.current = null;
      return;
    }

    touchStart.current = { x, y: touch.clientY };
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (!touchStart.current) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStart.current.x;
    const deltaY = touch.clientY - touchStart.current.y;

    touchStart.current = null;

    // Ignore if vertical movement exceeds horizontal (user is scrolling)
    if (Math.abs(deltaY) > Math.abs(deltaX)) return;

    // Ignore if below threshold
    if (Math.abs(deltaX) < SWIPE_THRESHOLD) return;

    if (deltaX < 0) {
      onSwipeLeft();
    } else {
      onSwipeRight();
    }
  }

  return (
    <div
      className={cn("flex-1 overflow-hidden", className)}
      style={{ touchAction: "pan-y" }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/calendar/views/mobile/swipe-container.test.tsx`
Expected: All 7 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/calendar/views/mobile/swipe-container.tsx src/components/calendar/views/mobile/swipe-container.test.tsx
git commit -m "feat(calendar): add SwipeContainer gesture handler for mobile navigation"
```

---

## Task 2: MemberAvatar — Shared Primitive

**Files:**
- Create: `src/components/calendar/components/member-avatar.tsx`
- Create: `src/components/calendar/components/member-avatar.test.tsx`

Small reusable component used by schedule view, mobile weekly, mobile toolbar filter dots, and event detail.

- [ ] **Step 1: Write failing tests**

```tsx
// src/components/calendar/components/member-avatar.test.tsx
import { render, screen } from "@/test/test-utils";
import { MemberAvatar } from "./member-avatar";

describe("MemberAvatar", () => {
  it("renders member initial", () => {
    render(<MemberAvatar name="Alice" color="coral" />);
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("applies member color as background", () => {
    render(<MemberAvatar name="Alice" color="coral" />);
    const el = screen.getByText("A");
    // coral bg maps to bg-[#e88470] via colorMap
    expect(el).toHaveClass("bg-[#e88470]");
  });

  it("renders at default size (24px)", () => {
    render(<MemberAvatar name="Bob" color="teal" />);
    const el = screen.getByText("B");
    expect(el).toHaveClass("w-6", "h-6");
  });

  it("renders at custom size", () => {
    render(<MemberAvatar name="Bob" color="teal" size="sm" />);
    const el = screen.getByText("B");
    expect(el).toHaveClass("w-5", "h-5");
  });

  it("renders ring variant (outline, no fill)", () => {
    render(<MemberAvatar name="Carol" color="green" variant="ring" />);
    const el = screen.getByText("C");
    expect(el).toHaveClass("border-2");
    expect(el).not.toHaveClass("bg-[#7bc67b]");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/calendar/components/member-avatar.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Implement MemberAvatar**

```tsx
// src/components/calendar/components/member-avatar.tsx
import { cn } from "@/lib/utils";
import { colorMap, type FamilyColor } from "@/lib/types";

const sizeClasses = {
  sm: "w-5 h-5 text-[8px]",
  md: "w-6 h-6 text-[9px]",
  lg: "w-8 h-8 text-xs",
} as const;

interface MemberAvatarProps {
  name: string;
  color: FamilyColor;
  size?: keyof typeof sizeClasses;
  variant?: "filled" | "ring";
  className?: string;
}

export function MemberAvatar({
  name,
  color,
  size = "md",
  variant = "filled",
  className,
}: MemberAvatarProps) {
  const colors = colorMap[color];
  const initial = name.charAt(0).toUpperCase();

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full font-bold shrink-0",
        sizeClasses[size],
        variant === "filled"
          ? `${colors.bg} text-white`
          : `border-2 bg-transparent ${colors.text}`,
        className,
      )}
      style={variant === "ring" ? { borderColor: colors.bg.replace("bg-[", "").replace("]", "") } : undefined}
    >
      {initial}
    </span>
  );
}
```

Note: The `ring` variant border color needs the hex value extracted from the Tailwind class. Check `colorMap` structure during implementation — if `colorMap` stores hex values directly (e.g., `{ bg: "bg-[#e88470]" }`), extract the hex. If it stores semantic names, use the appropriate approach. The implementer should verify `colorMap` at `src/lib/types/family.ts:colorMap` and adjust accordingly.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/calendar/components/member-avatar.test.tsx`
Expected: All 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/calendar/components/member-avatar.tsx src/components/calendar/components/member-avatar.test.tsx
git commit -m "feat(calendar): add MemberAvatar component for member identity display"
```

---

## Task 3: MobileEventSheet — Full-Screen Form Wrapper

**Files:**
- Create: `src/components/calendar/components/mobile-event-sheet.tsx`
- Create: `src/components/calendar/components/mobile-event-sheet.test.tsx`

Replaces `Dialog` on mobile for event creation/editing. Fixed full-screen overlay with slide-up animation.

- [ ] **Step 1: Write failing tests**

```tsx
// src/components/calendar/components/mobile-event-sheet.test.tsx
import { render, screen } from "@/test/test-utils";
import { MobileEventSheet } from "./mobile-event-sheet";

describe("MobileEventSheet", () => {
  it("renders children when open", () => {
    render(
      <MobileEventSheet isOpen={true} onClose={vi.fn()} title="New Event">
        <div>form content</div>
      </MobileEventSheet>,
    );
    expect(screen.getByText("form content")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    render(
      <MobileEventSheet isOpen={false} onClose={vi.fn()} title="New Event">
        <div>form content</div>
      </MobileEventSheet>,
    );
    expect(screen.queryByText("form content")).not.toBeInTheDocument();
  });

  it("renders title in header", () => {
    render(
      <MobileEventSheet isOpen={true} onClose={vi.fn()} title="Edit Event">
        <div>content</div>
      </MobileEventSheet>,
    );
    expect(screen.getByText("Edit Event")).toBeInTheDocument();
  });

  it("renders Cancel button that calls onClose", async () => {
    const onClose = vi.fn();
    render(
      <MobileEventSheet isOpen={true} onClose={onClose} title="New Event">
        <div>content</div>
      </MobileEventSheet>,
    );
    fireEvent.click(screen.getByText("Cancel"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("renders right-side slot content when provided", () => {
    render(
      <MobileEventSheet
        isOpen={true}
        onClose={vi.fn()}
        title="New Event"
        headerRight={<button type="button">Add</button>}
      >
        <div>content</div>
      </MobileEventSheet>,
    );
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
  });

  it("uses fixed inset-0 z-50 positioning", () => {
    render(
      <MobileEventSheet isOpen={true} onClose={vi.fn()} title="New Event">
        <div>content</div>
      </MobileEventSheet>,
    );
    const sheet = screen.getByRole("dialog");
    expect(sheet).toHaveClass("fixed", "inset-0", "z-50");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/calendar/components/mobile-event-sheet.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Implement MobileEventSheet**

```tsx
// src/components/calendar/components/mobile-event-sheet.tsx
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MobileEventSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  headerRight?: ReactNode;
  children: ReactNode;
}

export function MobileEventSheet({
  isOpen,
  onClose,
  title,
  headerRight,
  children,
}: MobileEventSheetProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-label={title}
      aria-describedby={undefined}
      className={cn(
        "fixed inset-0 z-50 bg-card flex flex-col",
        "motion-safe:animate-in motion-safe:slide-in-from-bottom motion-safe:duration-200",
      )}
    >
      {/* Fixed header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <button
          type="button"
          onClick={onClose}
          className="text-primary font-medium text-sm"
        >
          Cancel
        </button>
        <span className="font-bold text-base">{title}</span>
        {headerRight ?? <div className="w-16" /> /* Spacer for centering title */}
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
```

The `headerRight` slot allows the parent (`EventFormModal`) to pass in whatever submit button it needs, or nothing at all. The `EventForm` component keeps its own internal submit button — on mobile inside the sheet, it renders at the bottom of the scrollable form body as usual. This avoids any dual-button conflict.

Alternatively, if the design strongly calls for a header submit button, the implementer can add a `form` attribute to connect the header button to the form:
```tsx
// In EventFormModal's mobile branch:
<MobileEventSheet
  isOpen={isOpen}
  onClose={onClose}
  title={mode === "add" ? "New Event" : "Edit Event"}
  headerRight={
    <button type="submit" form="event-form" className="bg-primary text-primary-foreground rounded-lg px-4 py-1.5 text-sm font-semibold">
      {mode === "add" ? "Add" : "Save"}
    </button>
  }
>
  <EventForm formId="event-form" ... />  {/* EventForm must set id={formId} on <form> */}
</MobileEventSheet>
```

This requires a small change to `EventForm`: accept an optional `formId` prop and set `<form id={formId}>`. The implementer should decide which approach fits better. Either way, the `EventForm`'s internal Cancel/Submit buttons should be hidden when inside a `MobileEventSheet` — pass a `hideActions` prop.
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/calendar/components/mobile-event-sheet.test.tsx`
Expected: All 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/calendar/components/mobile-event-sheet.tsx src/components/calendar/components/mobile-event-sheet.test.tsx
git commit -m "feat(calendar): add MobileEventSheet full-screen form wrapper"
```

---

## Task 4: MobileEventDetail — Full-Screen Event Detail

**Files:**
- Create: `src/components/calendar/components/mobile-event-detail.tsx`
- Create: `src/components/calendar/components/mobile-event-detail.test.tsx`

Full-screen event detail with member-colored gradient header.

- [ ] **Step 1: Write failing tests**

```tsx
// src/components/calendar/components/mobile-event-detail.test.tsx
import { render, screen } from "@/test/test-utils";
import { MobileEventDetail } from "./mobile-event-detail";
import type { CalendarEvent } from "@/lib/types";

const mockEvent: CalendarEvent = {
  id: "1",
  title: "Soccer Practice",
  date: new Date(2026, 2, 18),
  startTime: "11:00 AM",
  endTime: "12:30 PM",
  memberId: "m1",
  isAllDay: false,
};

const mockMember = { id: "m1", name: "Kid1", color: "green" as const };

describe("MobileEventDetail", () => {
  it("renders event title in colored header", () => {
    render(
      <MobileEventDetail
        event={mockEvent}
        member={mockMember}
        isOpen={true}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText("Soccer Practice")).toBeInTheDocument();
  });

  it("renders member name", () => {
    render(
      <MobileEventDetail
        event={mockEvent}
        member={mockMember}
        isOpen={true}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText("Kid1")).toBeInTheDocument();
  });

  it("renders date and time", () => {
    render(
      <MobileEventDetail
        event={mockEvent}
        member={mockMember}
        isOpen={true}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText(/11:00 AM/)).toBeInTheDocument();
    expect(screen.getByText(/12:30 PM/)).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    render(
      <MobileEventDetail
        event={mockEvent}
        member={mockMember}
        isOpen={false}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.queryByText("Soccer Practice")).not.toBeInTheDocument();
  });

  it("calls onClose when Back is clicked", async () => {
    const onClose = vi.fn();
    render(
      <MobileEventDetail
        event={mockEvent}
        member={mockMember}
        isOpen={true}
        onClose={onClose}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /back/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("renders Edit and Delete buttons", () => {
    render(
      <MobileEventDetail
        event={mockEvent}
        member={mockMember}
        isOpen={true}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /edit/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument();
  });

  it("hides location row when no location", () => {
    render(
      <MobileEventDetail
        event={mockEvent}
        member={mockMember}
        isOpen={true}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    // No MapPin icon or location text when event has no location
    expect(screen.queryByText("Riverside Park")).not.toBeInTheDocument();
  });

  it("shows location row when event has location", () => {
    const eventWithLocation = { ...mockEvent, location: "Riverside Park" };
    render(
      <MobileEventDetail
        event={eventWithLocation}
        member={mockMember}
        isOpen={true}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText("Riverside Park")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/calendar/components/mobile-event-detail.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Implement MobileEventDetail**

The implementer should:
1. Read `src/components/calendar/components/event-detail-modal.tsx` (213 lines) for the existing detail layout and data formatting patterns
2. Create a full-screen overlay (`fixed inset-0 z-50`) with:
   - Colored gradient header using `colorMap[member.color]` — the bg hex value as the gradient base
   - Back button (left, white), Edit/Delete buttons (right, semi-transparent white bg)
   - Event title (22px, bold, white) and member avatar + name
3. Detail rows section (white bg) with:
   - Clock icon + formatted date (line 1) + time range (line 2) — reuse date formatting from existing `event-detail-modal.tsx`
   - Repeat icon + recurrence label (if `event.recurrenceRule`) — use `formatRecurrenceLabel()` from `src/lib/recurrence-utils.ts`
   - MapPin icon + location (only if `event.location`)
   - Note: `CalendarEvent` has no `notes` field currently — skip the notes row. It can be added when the type/API supports it.
4. Icon color should use the member's color from `colorMap`
5. Two-step delete confirmation matching existing pattern in `event-detail-modal.tsx`

Props interface:
```tsx
interface MobileEventDetailProps {
  event: CalendarEvent;
  member: { id: string; name: string; color: FamilyColor };
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting?: boolean;
  deleteError?: string | null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/calendar/components/mobile-event-detail.test.tsx`
Expected: All 8 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/calendar/components/mobile-event-detail.tsx src/components/calendar/components/mobile-event-detail.test.tsx
git commit -m "feat(calendar): add MobileEventDetail full-screen view with colored header"
```

---

## Task 5: MobileToolbar — Compact 2-Row Toolbar

**Files:**
- Create: `src/components/calendar/components/mobile-toolbar.tsx`
- Create: `src/components/calendar/components/mobile-toolbar.test.tsx`

Replaces the 3-row toolbar with a compact 2-row design on mobile.

- [ ] **Step 1: Write failing tests**

```tsx
// src/components/calendar/components/mobile-toolbar.test.tsx
import { render, screen } from "@/test/test-utils";
import { MobileToolbar } from "./mobile-toolbar";
import { seedCalendarStore } from "@/test/test-utils";

const mockMembers = [
  { id: "m1", name: "Alice", color: "coral" as const },
  { id: "m2", name: "Bob", color: "teal" as const },
];

describe("MobileToolbar", () => {
  it("renders context label based on view", () => {
    seedCalendarStore({
      calendarView: "monthly",
      currentDate: new Date(2026, 2, 18), // March 2026
    });
    render(
      <MobileToolbar
        members={mockMembers}
        onOpenSidebar={vi.fn()}
        onGoHome={vi.fn()}
      />,
    );
    expect(screen.getByText(/March 2026/)).toBeInTheDocument();
  });

  it("renders view switcher with D/W/M/S pills", () => {
    render(
      <MobileToolbar
        members={mockMembers}
        onOpenSidebar={vi.fn()}
        onGoHome={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /daily/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /weekly/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /monthly/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /schedule/i })).toBeInTheDocument();
  });

  it("renders member filter dots for each member", () => {
    render(
      <MobileToolbar
        members={mockMembers}
        onOpenSidebar={vi.fn()}
        onGoHome={vi.fn()}
      />,
    );
    expect(screen.getByText("A")).toBeInTheDocument(); // Alice initial
    expect(screen.getByText("B")).toBeInTheDocument(); // Bob initial
  });

  it("renders Today button", () => {
    render(
      <MobileToolbar
        members={mockMembers}
        onOpenSidebar={vi.fn()}
        onGoHome={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /today/i })).toBeInTheDocument();
  });

  it("renders hamburger menu button", () => {
    const onOpenSidebar = vi.fn();
    render(
      <MobileToolbar
        members={mockMembers}
        onOpenSidebar={onOpenSidebar}
      />,
    );
    const menuButton = screen.getByRole("button", { name: /menu/i });
    expect(menuButton).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/calendar/components/mobile-toolbar.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Implement MobileToolbar**

The implementer should:
1. Read `src/components/calendar/components/calendar-view-switcher.tsx` (46 lines) for view switching pattern
2. Read `src/components/calendar/components/family-filter-pills.tsx` (112 lines) for filter toggle logic
3. Read `src/components/calendar/components/calendar-navigation.tsx` (62 lines) for Today button pattern and context label formatting
4. Read `src/stores/calendar-store.ts` for store actions: `setCalendarView`, `goToToday`, filter toggles, `useIsViewingToday`

Build a component with two rows:

**Row 1 (Header Bar):**
- Left: Context label — computed from `calendarView` and `currentDate`:
  - monthly → `format(currentDate, "MMMM yyyy")` (e.g., "March 2026")
  - weekly → `format(startOfWeek, "MMM d") + " – " + format(endOfWeek, "d")` (e.g., "Mar 16 – 22")
  - daily → `format(currentDate, "EEE, MMM d")` (e.g., "Wed, Mar 18")
  - schedule → "Upcoming"
- Right: "Today" text button (uses `goToToday` action, styled with `text-primary font-semibold` when not viewing today, `text-primary/50` when viewing today) + Home icon button (calls `onGoHome` prop — sets `activeModule` to `null` to return to home dashboard) + Menu icon button (calls `onOpenSidebar` prop)

**Row 2 (Controls Bar):**
- Left: View switcher — 4 buttons labeled D/W/M/S with `aria-label` for accessibility (e.g., "Daily view"). Active gets `bg-primary text-primary-foreground`. Container: `bg-muted rounded-lg p-0.5`
- Right: Member filter dots — map over `members`, render `MemberAvatar` with `variant="filled"` when included in `filter.selectedMembers`, `variant="ring"` when excluded. Tap toggles via `toggleMember(member.id)`. 44px tap area via padding.

Props interface:
```tsx
interface MobileToolbarProps {
  members: FamilyMember[];
  onOpenSidebar: () => void;
  onGoHome: () => void;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/calendar/components/mobile-toolbar.test.tsx`
Expected: All 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/calendar/components/mobile-toolbar.tsx src/components/calendar/components/mobile-toolbar.test.tsx
git commit -m "feat(calendar): add MobileToolbar compact 2-row toolbar"
```

---

## Task 6: Mobile Daily View

**Files:**
- Create: `src/components/calendar/views/mobile/mobile-daily-view.tsx`
- Create: `src/components/calendar/views/mobile/mobile-daily-view.test.tsx`

Full-width time grid with 60px/hr rows, 32px time column, swipe navigation.

- [ ] **Step 1: Write failing tests**

```tsx
// src/components/calendar/views/mobile/mobile-daily-view.test.tsx
import { render, screen, fireEvent } from "@/test/test-utils";
import { MobileDailyView } from "./mobile-daily-view";
import type { CalendarEvent } from "@/lib/types";

const mockEvents: CalendarEvent[] = [
  {
    id: "1",
    title: "Team Standup",
    date: new Date(2026, 2, 18),
    startTime: "9:00 AM",
    endTime: "9:30 AM",
    memberId: "m1",
    isAllDay: false,
  },
  {
    id: "2",
    title: "Lunch",
    date: new Date(2026, 2, 18),
    startTime: "12:00 PM",
    endTime: "1:00 PM",
    memberId: "m2",
    isAllDay: false,
  },
];

const mockMemberMap = new Map([
  ["m1", { id: "m1", name: "Alice", color: "coral" as const }],
  ["m2", { id: "m2", name: "Bob", color: "teal" as const }],
]);

describe("MobileDailyView", () => {
  it("renders time labels", () => {
    render(
      <MobileDailyView
        events={mockEvents}
        currentDate={new Date(2026, 2, 18)}
        memberMap={mockMemberMap}
        onEventClick={vi.fn()}
        onSwipeLeft={vi.fn()}
        onSwipeRight={vi.fn()}
      />,
    );
    // Even hours only on mobile
    expect(screen.getByText("8 AM")).toBeInTheDocument();
    expect(screen.getByText("10 AM")).toBeInTheDocument();
  });

  it("renders event titles", () => {
    render(
      <MobileDailyView
        events={mockEvents}
        currentDate={new Date(2026, 2, 18)}
        memberMap={mockMemberMap}
        onEventClick={vi.fn()}
        onSwipeLeft={vi.fn()}
        onSwipeRight={vi.fn()}
      />,
    );
    expect(screen.getByText("Team Standup")).toBeInTheDocument();
    expect(screen.getByText("Lunch")).toBeInTheDocument();
  });

  it("calls onEventClick when event is tapped", async () => {
    const onEventClick = vi.fn();
    render(
      <MobileDailyView
        events={mockEvents}
        currentDate={new Date(2026, 2, 18)}
        memberMap={mockMemberMap}
        onEventClick={onEventClick}
        onSwipeLeft={vi.fn()}
        onSwipeRight={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText("Team Standup"));
    expect(onEventClick).toHaveBeenCalledWith(mockEvents[0]);
  });

  it("wraps content in SwipeContainer", () => {
    const onSwipeLeft = vi.fn();
    const { container } = render(
      <MobileDailyView
        events={mockEvents}
        currentDate={new Date(2026, 2, 18)}
        memberMap={mockMemberMap}
        onEventClick={vi.fn()}
        onSwipeLeft={onSwipeLeft}
        onSwipeRight={vi.fn()}
      />,
    );
    // SwipeContainer applies touch-action: pan-y
    const swipeEl = container.querySelector('[style*="touch-action"]');
    expect(swipeEl).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/calendar/views/mobile/mobile-daily-view.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Implement MobileDailyView**

The implementer should:
1. Read `src/components/calendar/views/daily-calendar.tsx` to understand the existing time grid layout, event positioning logic (column overlap detection), current time indicator, and auto-scroll behavior
2. Read `src/lib/time-utils.ts` for `CALENDAR_START_HOUR`, `CALENDAR_END_HOUR`, `getTimeInMinutes`, `compareEventsByTime`

Build a component that:
- Uses `SwipeContainer` as the outer wrapper, passing `onSwipeLeft`/`onSwipeRight` through
- Renders a time grid with `ROW_HEIGHT = 60` (not 80) and time column `w-8` (32px, not 48px)
- Shows time labels on even hours only (6, 8, 10, 12, 14, 16, 18, 20, 22)
- Positions events absolutely using the same `top/height` calculation as desktop but with the new ROW_HEIGHT
- Limits overlapping columns to 2 (not 3): `const effectiveColumns = Math.min(totalColumns, 2)`
- Uses 4px margins (not 8px/12px): `calc(${left}% + 4px)` width `calc(${width}% - 6px)`
- Event cards: 44px min height, member-colored left border (3px), title (font-semibold text-[13px]) + time (text-[11px] text-muted-foreground)
- Current time indicator: red line with dot (reuse pattern from existing daily-calendar.tsx)
- Auto-scrolls to current time minus 1 hour on mount

Props interface:
```tsx
interface MobileDailyViewProps {
  events: CalendarEvent[];
  currentDate: Date;
  memberMap: Map<string, FamilyMember>;
  onEventClick: (event: CalendarEvent) => void;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/calendar/views/mobile/mobile-daily-view.test.tsx`
Expected: All 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/calendar/views/mobile/mobile-daily-view.tsx src/components/calendar/views/mobile/mobile-daily-view.test.tsx
git commit -m "feat(calendar): add MobileDailyView with 60px rows and swipe navigation"
```

---

## Task 7: Mobile Weekly View

**Files:**
- Create: `src/components/calendar/views/mobile/mobile-weekly-view.tsx`
- Create: `src/components/calendar/views/mobile/mobile-weekly-view.test.tsx`

Complete rethink: date strip header + day-by-day event list (no time grid).

- [ ] **Step 1: Write failing tests**

```tsx
// src/components/calendar/views/mobile/mobile-weekly-view.test.tsx
import { render, screen } from "@/test/test-utils";
import { MobileWeeklyView } from "./mobile-weekly-view";
import type { CalendarEvent } from "@/lib/types";

const mockEvents: CalendarEvent[] = [
  {
    id: "1",
    title: "Team Standup",
    date: new Date(2026, 2, 16),
    startTime: "9:00 AM",
    endTime: "9:30 AM",
    memberId: "m1",
    isAllDay: false,
  },
  {
    id: "2",
    title: "Soccer Practice",
    date: new Date(2026, 2, 18),
    startTime: "11:00 AM",
    endTime: "12:30 PM",
    memberId: "m2",
    isAllDay: false,
  },
];

const mockMemberMap = new Map([
  ["m1", { id: "m1", name: "Alice", color: "coral" as const }],
  ["m2", { id: "m2", name: "Bob", color: "teal" as const }],
]);

describe("MobileWeeklyView", () => {
  it("renders week date strip with day initials", () => {
    render(
      <MobileWeeklyView
        events={mockEvents}
        currentDate={new Date(2026, 2, 18)}
        memberMap={mockMemberMap}
        onEventClick={vi.fn()}
        onDayClick={vi.fn()}
        onSwipeLeft={vi.fn()}
        onSwipeRight={vi.fn()}
      />,
    );
    // Should show 7 day columns in the date strip
    const dateStrip = screen.getByRole("navigation", { name: /week/i });
    expect(dateStrip).toBeInTheDocument();
    // Check that date numbers for the week are rendered (Mar 15-21, 2026 week containing Mar 18)
    expect(screen.getByText("18")).toBeInTheDocument();
  });

  it("renders events grouped by day", () => {
    render(
      <MobileWeeklyView
        events={mockEvents}
        currentDate={new Date(2026, 2, 18)}
        memberMap={mockMemberMap}
        onEventClick={vi.fn()}
        onDayClick={vi.fn()}
        onSwipeLeft={vi.fn()}
        onSwipeRight={vi.fn()}
      />,
    );
    expect(screen.getByText("Team Standup")).toBeInTheDocument();
    expect(screen.getByText("Soccer Practice")).toBeInTheDocument();
  });

  it("shows 'No events' for empty days", () => {
    render(
      <MobileWeeklyView
        events={[]} // No events this week
        currentDate={new Date(2026, 2, 18)}
        memberMap={mockMemberMap}
        onEventClick={vi.fn()}
        onDayClick={vi.fn()}
        onSwipeLeft={vi.fn()}
        onSwipeRight={vi.fn()}
      />,
    );
    // At least one day should show "No events"
    expect(screen.getAllByText("No events").length).toBeGreaterThan(0);
  });

  it("highlights today in the date strip", () => {
    // Use a fixed "today" by mocking Date.now or passing a `today` prop
    // The component should compare each day to today and add a highlight
    const fixedDate = new Date(2026, 2, 18);
    vi.setSystemTime(fixedDate);
    render(
      <MobileWeeklyView
        events={[]}
        currentDate={fixedDate}
        memberMap={mockMemberMap}
        onEventClick={vi.fn()}
        onDayClick={vi.fn()}
        onSwipeLeft={vi.fn()}
        onSwipeRight={vi.fn()}
      />,
    );
    expect(screen.getByText(/today/i)).toBeInTheDocument();
    vi.useRealTimers();
  });

  it("calls onDayClick when day label is tapped", async () => {
    const onDayClick = vi.fn();
    render(
      <MobileWeeklyView
        events={mockEvents}
        currentDate={new Date(2026, 2, 18)}
        memberMap={mockMemberMap}
        onEventClick={vi.fn()}
        onDayClick={onDayClick}
        onSwipeLeft={vi.fn()}
        onSwipeRight={vi.fn()}
      />,
    );
    // Click on a day label (the day number)
    const dayButtons = screen.getAllByRole("button", { name: /view day/i });
    fireEvent.click(dayButtons[0]);
    expect(onDayClick).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/calendar/views/mobile/mobile-weekly-view.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Implement MobileWeeklyView**

The implementer should:
1. Read `src/components/calendar/views/weekly-calendar.tsx` for the existing week date range computation (uses `startOfWeek`/`endOfWeek` from date-fns) and event grouping logic
2. Read `src/lib/time-utils.ts` for `formatLocalDate`, `parseLocalDate`

Build a component with two sections:

**Date Strip Header:**
- 7-column grid: day initials (S M T W T F S) on row 1, date numbers on row 2
- Today: purple circle background on date number + "TODAY" label in `text-[8px] text-primary`
- Days with events: up to 3 member-colored dots (4px, `w-1 h-1 rounded-full`) below date number
- Tap a date number to call `onDayClick(date)` — the day label area should be a button with `aria-label="View day [date]"` and a subtle chevron icon

**Day-by-Day Event List:**
- Iterate Sun–Sat for the week containing `currentDate`
- Each day section: day label area (left, min-w-[28px]) with abbreviated day + date number, event list (right)
- Today section: subtle `bg-primary/5` background, date number in `text-primary`
- Events: member-colored dot (6px, `w-1.5 h-1.5 rounded-full`) + title (text-sm) + time (text-xs text-muted-foreground, right-aligned, `ml-auto`)
- Empty days: "No events" in `text-muted-foreground text-xs`
- Each event row is a button calling `onEventClick(event)` with 44px min touch target

Wrap in `SwipeContainer` for week navigation.

Props:
```tsx
interface MobileWeeklyViewProps {
  events: CalendarEvent[];
  currentDate: Date;
  memberMap: Map<string, FamilyMember>;
  onEventClick: (event: CalendarEvent) => void;
  onDayClick: (date: Date) => void;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/calendar/views/mobile/mobile-weekly-view.test.tsx`
Expected: All 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/calendar/views/mobile/mobile-weekly-view.tsx src/components/calendar/views/mobile/mobile-weekly-view.test.tsx
git commit -m "feat(calendar): add MobileWeeklyView with date strip and event list"
```

---

## Task 8: Mobile Monthly View

**Files:**
- Create: `src/components/calendar/views/mobile/mobile-monthly-view.tsx`
- Create: `src/components/calendar/views/mobile/mobile-monthly-view.test.tsx`

Dot-indicator grid + selected day event list (Apple Calendar pattern).

- [ ] **Step 1: Write failing tests**

```tsx
// src/components/calendar/views/mobile/mobile-monthly-view.test.tsx
import { render, screen } from "@/test/test-utils";
import { MobileMonthlyView } from "./mobile-monthly-view";
import type { CalendarEvent } from "@/lib/types";

const mockEvents: CalendarEvent[] = [
  {
    id: "1",
    title: "Soccer Practice",
    date: new Date(2026, 2, 18),
    startTime: "11:00 AM",
    endTime: "12:30 PM",
    memberId: "m1",
    isAllDay: false,
  },
  {
    id: "2",
    title: "Grocery Run",
    date: new Date(2026, 2, 18),
    startTime: "3:00 PM",
    endTime: "4:00 PM",
    memberId: "m2",
    isAllDay: false,
  },
];

const mockMemberMap = new Map([
  ["m1", { id: "m1", name: "Alice", color: "coral" as const }],
  ["m2", { id: "m2", name: "Bob", color: "teal" as const }],
]);

describe("MobileMonthlyView", () => {
  it("renders day initials header", () => {
    render(
      <MobileMonthlyView
        events={mockEvents}
        currentDate={new Date(2026, 2, 18)}
        memberMap={mockMemberMap}
        onEventClick={vi.fn()}
        onDaySelect={vi.fn()}
        onSwipeLeft={vi.fn()}
        onSwipeRight={vi.fn()}
      />,
    );
    expect(screen.getByText("S")).toBeInTheDocument();
    expect(screen.getByText("M")).toBeInTheDocument();
  });

  it("renders selected day event list when day is tapped", async () => {
    const onDaySelect = vi.fn();
    render(
      <MobileMonthlyView
        events={mockEvents}
        currentDate={new Date(2026, 2, 18)} // March 18 selected by default
        memberMap={mockMemberMap}
        onEventClick={vi.fn()}
        onDaySelect={onDaySelect}
        onSwipeLeft={vi.fn()}
        onSwipeRight={vi.fn()}
      />,
    );
    // Default selection is currentDate — should show events for March 18
    expect(screen.getByText("Soccer Practice")).toBeInTheDocument();
    expect(screen.getByText("Grocery Run")).toBeInTheDocument();
  });

  it("shows 'No events' when selected day has no events", () => {
    render(
      <MobileMonthlyView
        events={mockEvents}
        currentDate={new Date(2026, 2, 1)} // March 1 — no events
        memberMap={mockMemberMap}
        onEventClick={vi.fn()}
        onDaySelect={vi.fn()}
        onSwipeLeft={vi.fn()}
        onSwipeRight={vi.fn()}
      />,
    );
    expect(screen.getByText("No events")).toBeInTheDocument();
  });

  it("renders date numbers for the month", () => {
    render(
      <MobileMonthlyView
        events={mockEvents}
        currentDate={new Date(2026, 2, 18)}
        memberMap={mockMemberMap}
        onEventClick={vi.fn()}
        onDaySelect={vi.fn()}
        onSwipeLeft={vi.fn()}
        onSwipeRight={vi.fn()}
      />,
    );
    // March 2026 has 31 days — check a few specific dates
    const grid = screen.getByRole("grid");
    expect(grid).toBeInTheDocument();
    // Use getAllByRole for date cells to verify the grid is populated
    const cells = screen.getAllByRole("button", { name: /march/i });
    expect(cells.length).toBeGreaterThanOrEqual(28); // At least 28 days
  });

  it("calls onDaySelect when a date cell is tapped", async () => {
    const onDaySelect = vi.fn();
    render(
      <MobileMonthlyView
        events={mockEvents}
        currentDate={new Date(2026, 2, 18)}
        memberMap={mockMemberMap}
        onEventClick={vi.fn()}
        onDaySelect={onDaySelect}
        onSwipeLeft={vi.fn()}
        onSwipeRight={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText("15"));
    expect(onDaySelect).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/calendar/views/mobile/mobile-monthly-view.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Implement MobileMonthlyView**

The implementer should:
1. Read `src/components/calendar/views/monthly-calendar.tsx` for the existing month grid generation logic (uses `startOfMonth`, `endOfMonth`, `startOfWeek`, `endOfWeek`, `eachDayOfInterval` from date-fns) and event-per-day bucketing
2. Read `src/lib/types/family.ts` for `colorMap` hex values used for dot colors

Build a component with two sections:

**Compact Calendar Grid:**
- 7-column CSS grid with day initials header (S M T W T F S, `text-xs text-muted-foreground`)
- Cells: ~44px height, date number (centered), up to 3 colored dots below (4px, `w-1 h-1 rounded-full`) using member colors from events on that day
- Today: purple circle background on date number
- Selected day (`currentDate`): subtle `ring-2 ring-primary/30 rounded-lg` background
- Days outside current month: `text-muted-foreground/40` (dimmed)
- Each cell is a `button` calling `onDaySelect(date)` with `aria-label` like "March 18, 2 events"

**Selected Day Event List:**
- Separator border between grid and list
- Header: Full date string (e.g., "Wednesday, Mar 18") in `font-semibold text-sm`
- Event rows: member-colored left border (3px, `rounded-sm`) + event title (text-sm) + time range (text-xs text-muted-foreground)
- Each event row is a button calling `onEventClick(event)` with 44px min touch target
- Empty state: "No events" text + subtle prompt

Wrap in `SwipeContainer` for month navigation.

Props:
```tsx
interface MobileMonthlyViewProps {
  events: CalendarEvent[];
  currentDate: Date;
  memberMap: Map<string, FamilyMember>;
  onEventClick: (event: CalendarEvent) => void;
  onDaySelect: (date: Date) => void;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/calendar/views/mobile/mobile-monthly-view.test.tsx`
Expected: All 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/calendar/views/mobile/mobile-monthly-view.tsx src/components/calendar/views/mobile/mobile-monthly-view.test.tsx
git commit -m "feat(calendar): add MobileMonthlyView with dot grid and day event list"
```

---

## Task 9: Schedule View Refinements

**Files:**
- Modify: `src/components/calendar/views/schedule-calendar.tsx`

Responsive refinements to the existing shared schedule view. No separate mobile component needed.

- [ ] **Step 1: Write failing tests for new behavior**

Add tests to the existing test file (or create one if it doesn't exist) at `src/components/calendar/views/schedule-calendar.test.tsx`:

```tsx
// Tests to add:
it("renders member avatar initial on event cards", () => {
  // Render with events that have memberIds
  // Expect to find the member initial in a MemberAvatar
});

it("uses 'Today — Wed, Mar 18' format for today header", () => {
  // Mock current date, render with events on today
  // Expect "Today —" prefix with weekday abbreviation
});

it("uses 'Tomorrow — Thu, Mar 19' format for tomorrow header", () => {
  // Similar test for tomorrow
});
```

The implementer should check if `src/components/calendar/views/schedule-calendar.test.tsx` exists. If not, create it with these tests plus basic rendering tests.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/calendar/views/schedule-calendar.test.tsx`
Expected: FAIL — new assertions fail

- [ ] **Step 3: Modify schedule-calendar.tsx**

Changes to make in `src/components/calendar/views/schedule-calendar.tsx`:
1. Import `MemberAvatar` from `../components/member-avatar`
2. Import `useIsMobile` from `@/hooks`
3. Add `memberMap` prop (or receive it — check how CalendarModule passes data)
4. In the event card rendering, add `MemberAvatar` on the right side:
   ```tsx
   <MemberAvatar
     name={member.name}
     color={member.color}
     size="md"
   />
   ```
5. Adjust container padding: `p-3 sm:p-4` (12px mobile, 16px desktop)
6. Adjust event card padding: `p-2.5 sm:p-3` (10px mobile, 12px desktop)
7. Update date header format: replace existing format with:
   - Today: `"Today — " + format(date, "EEE, MMM d")`
   - Tomorrow: `"Tomorrow — " + format(date, "EEE, MMM d")`
   - Other: `format(date, "EEEE, MMM d")`
8. Event card minimum height: `min-h-[48px]`

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/calendar/views/schedule-calendar.test.tsx`
Expected: All tests PASS

- [ ] **Step 5: Run existing tests to verify no regressions**

Run: `npx vitest run`
Expected: All existing tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/calendar/views/schedule-calendar.tsx src/components/calendar/views/schedule-calendar.test.tsx
git commit -m "feat(calendar): add member avatars and responsive spacing to schedule view"
```

---

## Task 10: Wire Mobile Views into CalendarModule

**Files:**
- Modify: `src/components/calendar/calendar-module.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/calendar/components/event-form-modal.tsx`
- Modify: `src/components/calendar/components/event-detail-modal.tsx`
- Modify: `src/components/calendar/components/add-event-button.tsx`
- Create: `src/components/calendar/views/mobile/index.ts`
- Modify: `src/components/calendar/index.ts`

This is the orchestration task — wire everything together.

- [ ] **Step 1: Create barrel exports for mobile views**

```tsx
// src/components/calendar/views/mobile/index.ts
export { SwipeContainer } from "./swipe-container";
export { MobileDailyView } from "./mobile-daily-view";
export { MobileWeeklyView } from "./mobile-weekly-view";
export { MobileMonthlyView } from "./mobile-monthly-view";
```

- [ ] **Step 2: Update calendar barrel exports**

In `src/components/calendar/index.ts`, add:
```tsx
export * from "./views/mobile";
export { MemberAvatar } from "./components/member-avatar";
export { MobileToolbar } from "./components/mobile-toolbar";
export { MobileEventSheet } from "./components/mobile-event-sheet";
export { MobileEventDetail } from "./components/mobile-event-detail";
```

Also update `src/components/calendar/views/index.ts` to add `export * from "./mobile"` — this is where the top-level `calendar/index.ts` re-exports from, so the mobile barrel must be chained through `views/index.ts`.

- [ ] **Step 3: Modify CalendarModule for mobile branching**

In `src/components/calendar/calendar-module.tsx`:

1. Add imports:
   ```tsx
   import { useIsMobile } from "@/hooks";
   import { MobileToolbar } from "./components/mobile-toolbar";
   import { MobileDailyView, MobileWeeklyView, MobileMonthlyView } from "./views/mobile";
   ```

2. Add `const isMobile = useIsMobile();` at the top of the component

3. Get sidebar action: `const openSidebar = useAppStore((state) => state.openSidebar);`

4. In the toolbar section, conditionally render:
   ```tsx
   {isMobile ? (
     <MobileToolbar members={members} onOpenSidebar={openSidebar} onGoHome={() => setActiveModule(null)} />
   ) : (
     <div className="flex flex-col sm:flex-row ..."> {/* existing toolbar */}
       <CalendarViewSwitcher />
       <FamilyFilterPills />
     </div>
   )}
   ```

5. In the view rendering section, add mobile branching:
   ```tsx
   {isMobile ? (
     // Mobile views
     calendarView === "daily" ? (
       <MobileDailyView
         events={filteredEvents}
         currentDate={currentDate}
         memberMap={memberMap}
         onEventClick={openDetailModal}
         onSwipeLeft={goToNext}
         onSwipeRight={goToPrevious}
       />
     ) : calendarView === "weekly" ? (
       <MobileWeeklyView
         events={filteredEvents}
         currentDate={currentDate}
         memberMap={memberMap}
         onEventClick={openDetailModal}
         onDayClick={(date) => selectDateAndSwitchToDaily(date)}
         onSwipeLeft={goToNext}
         onSwipeRight={goToPrevious}
       />
     ) : calendarView === "monthly" ? (
       <MobileMonthlyView
         events={filteredEvents}
         currentDate={currentDate}
         memberMap={memberMap}
         onEventClick={openDetailModal}
         onDaySelect={(date) => setDate(date)}
         onSwipeLeft={goToNext}
         onSwipeRight={goToPrevious}
       />
     ) : (
       <ScheduleCalendar ... /> // Shared, already responsive
     )
   ) : (
     // Desktop views (existing code, unchanged)
     ...
   )}
   ```

   Note: The store action is `setDate` (line 154 of `calendar-store.ts`), available from `useCalendarActions()` as `setDate`. This updates `currentDate` without changing the view.

6. Note: `CalendarNavigation` is rendered inside each desktop view component (not in `CalendarModule`), so it will naturally not appear in mobile views. No action needed here.

- [ ] **Step 4: Modify EventFormModal for mobile**

In `src/components/calendar/components/event-form-modal.tsx`:
1. Import `useIsMobile` and `MobileEventSheet`
2. Add `const isMobile = useIsMobile();`
3. Conditionally wrap `EventForm`:
   ```tsx
   if (isMobile) {
     return (
       <MobileEventSheet
         isOpen={isOpen}
         onClose={onClose}
         title={mode === "add" ? "New Event" : "Edit Event"}
       >
         <EventForm ... />
       </MobileEventSheet>
     );
   }
   // Existing Dialog code below
   ```

- [ ] **Step 5: Modify EventDetailModal for mobile**

In `src/components/calendar/components/event-detail-modal.tsx`:
1. Import `useIsMobile` and `MobileEventDetail`
2. Import `useFamilyMemberMap` from `@/api` (may already be imported or member lookup available)
3. Add mobile branch:
   ```tsx
   if (isMobile && event) {
     const member = memberMap.get(event.memberId);
     return (
       <MobileEventDetail
         event={event}
         member={member}
         isOpen={isOpen}
         onClose={onClose}
         onEdit={onEdit}
         onDelete={onDelete}
         isDeleting={isDeleting}
         deleteError={deleteError}
       />
     );
   }
   // Existing Dialog code below
   ```

- [ ] **Step 6: Modify AddEventButton for safe-area**

In `src/components/calendar/components/add-event-button.tsx`:
Change the `bottom-8` class to use safe area:
```tsx
className="fixed z-40 w-14 h-14 rounded-full ... right-8"
style={{ bottom: "max(2rem, calc(env(safe-area-inset-bottom) + 1rem))" }}
```

- [ ] **Step 7: Modify App.tsx to hide AppHeader on mobile calendar**

In `src/App.tsx`:
1. Import `useIsMobile`
2. Add `const isMobile = useIsMobile();`
3. Conditionally render AppHeader:
   ```tsx
   {!(isMobile && activeModule === "calendar") && <AppHeader ... />}
   ```

- [ ] **Step 8: Run all tests**

Run: `npx vitest run`
Expected: All tests PASS (existing + new)

- [ ] **Step 9: Run lint**

Run: `npm run lint`
Expected: No errors

- [ ] **Step 10: Commit**

```bash
git add src/components/calendar/views/mobile/index.ts \
  src/components/calendar/index.ts \
  src/components/calendar/calendar-module.tsx \
  src/components/calendar/components/event-form-modal.tsx \
  src/components/calendar/components/event-detail-modal.tsx \
  src/components/calendar/components/add-event-button.tsx \
  src/App.tsx
git commit -m "feat(calendar): wire mobile views into CalendarModule with responsive branching"
```

---

## Task 11: E2E Tests for Mobile Calendar

**Files:**
- Modify or create: `e2e/mobile-calendar.spec.ts`

Test the mobile calendar experience end-to-end using Playwright's Mobile Chrome project.

- [ ] **Step 1: Write E2E tests**

The implementer should:
1. Read `e2e/helpers/api-helpers.ts` for `registerFamily`, `seedBrowserAuth`
2. Read `e2e/helpers/test-helpers.ts` for `clearStorage`, `safeClick`, `waitForCalendarReady`, `waitForDialogReady`, `waitForHydration`
3. Read existing E2E test files for patterns (e.g., `e2e/calendar-crud.spec.ts`)

```tsx
// e2e/mobile-calendar.spec.ts
import { test, expect } from "@playwright/test";
import { registerFamily, seedBrowserAuth } from "./helpers/api-helpers";
import {
  clearStorage,
  safeClick,
  waitForCalendarReady,
  waitForHydration,
} from "./helpers/test-helpers";

// Only run on mobile-chrome project
test.describe("Mobile Calendar Views", () => {
  test.beforeEach(async ({ page, request }) => {
    await page.goto("/");
    await clearStorage(page);

    const reg = await registerFamily(request, {
      familyName: "Test Family",
      members: [
        { name: "Alice", color: "coral" },
        { name: "Bob", color: "teal" },
      ],
    });
    await seedBrowserAuth(page, reg);
    await page.reload();
    await waitForHydration(page);
    await waitForCalendarReady(page);
  });

  test("mobile toolbar renders with D/W/M/S view switcher", async ({ page }) => {
    // Should see compact view switcher
    await expect(page.getByRole("button", { name: /daily/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /weekly/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /monthly/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /schedule/i })).toBeVisible();
  });

  test("can switch between all 4 views", async ({ page }) => {
    // Switch to daily
    await page.getByRole("button", { name: /daily/i }).click();
    // Daily view should show time labels
    await expect(page.getByText("8 AM")).toBeVisible();

    // Switch to weekly
    await page.getByRole("button", { name: /weekly/i }).click();
    // Weekly view should show day initials in date strip
    await expect(page.getByText("S")).toBeVisible();

    // Switch to monthly
    await page.getByRole("button", { name: /monthly/i }).click();
    // Monthly view should show date numbers
    await expect(page.getByText("1")).toBeVisible();
  });

  test("event creation uses full-screen sheet on mobile", async ({ page }) => {
    // Tap FAB
    await page.getByRole("button", { name: /add event/i }).click();

    // Should see full-screen sheet (not a dialog)
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText("New Event")).toBeVisible();
    await expect(page.getByText("Cancel")).toBeVisible();

    // Fill in event name
    await page.getByPlaceholder(/event name/i).fill("Test Event");

    // Submit
    await page.getByRole("button", { name: /add/i }).click();
  });

  test("no horizontal scrolling on any view at mobile viewport", async ({ page }) => {
    const views = ["daily", "weekly", "monthly", "schedule"];
    for (const view of views) {
      await page.getByRole("button", { name: new RegExp(view, "i") }).click();
      // Check that page width equals viewport width (no horizontal overflow)
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1); // 1px tolerance
    }
  });

  test("member filter dots toggle member visibility", async ({ page }) => {
    // Find member filter dot for Alice (initial "A")
    const aliceDot = page.locator('[aria-label*="Alice"]').first();
    await aliceDot.click();
    // Alice's events should be filtered out
    // (Implementation depends on having events seeded — adjust as needed)
  });
});
```

- [ ] **Step 2: Run E2E tests on mobile-chrome project**

Run: `npx playwright test e2e/mobile-calendar.spec.ts --project=mobile-chrome`
Expected: Tests pass (some may need adjustment based on actual implementation details)

- [ ] **Step 3: Fix any failing tests**

Adjust selectors, waits, or assertions based on actual rendered output.

- [ ] **Step 4: Commit**

```bash
git add e2e/mobile-calendar.spec.ts
git commit -m "test(e2e): add mobile calendar E2E tests for views, forms, and navigation"
```

---

## Task 12: Final Verification

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run`
Expected: All unit/integration tests PASS

- [ ] **Step 2: Run full E2E suite**

Run: `npx playwright test`
Expected: All E2E tests PASS (existing + new mobile tests)

- [ ] **Step 3: Run lint and format check**

Run: `npm run lint && npm run format:check`
Expected: No errors

- [ ] **Step 4: Build for production**

Run: `npm run build`
Expected: Build succeeds with no type errors

- [ ] **Step 5: Manual smoke test on mobile viewport**

Run: `npm run dev`
Open browser DevTools → toggle device toolbar → iPhone SE (375px)
Verify:
1. Calendar loads in schedule view (default for first-time mobile)
2. Toolbar shows 2 rows max
3. All 4 views render without horizontal scroll
4. FAB is visible and doesn't overlap content
5. Event creation opens full-screen sheet
6. Event detail opens with colored header
7. Swipe left/right navigates dates on daily/weekly/monthly
8. Member filter dots toggle correctly
9. AppHeader is hidden, MobileToolbar shows hamburger for sidebar

- [ ] **Step 6: Commit any final fixes**

```bash
# Stage only the specific files that were fixed
git add <changed-files>
git commit -m "fix(calendar): address final mobile calendar polish issues"
```

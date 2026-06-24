# Shared Mobile Creation FAB — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Standardize the mobile "create" action across Lists, Chores, and Recipes on the same floating `+` primitive Calendar already uses, while leaving desktop unchanged.

**Architecture:** Extract Calendar's `AddEventButton` presentation into a shared, presentational `FloatingActionButton` (in `@/components/shared`) that owns layout/position/press-feedback only. Each module renders it on mobile with its own action + accessible label, removes its inline/header create action on mobile, and adds bottom scroll padding so content clears the FAB and bottom nav. Calendar keeps `AddEventButton` as a thin wrapper (zero regression).

**Tech Stack:** React 19, TypeScript, Tailwind v4, shadcn `Button`, Vitest + Testing Library (component), Playwright (E2E), Biome (lint).

**Spec:** `docs/superpowers/specs/2026-06-24-mobile-shared-fab.md` · **Issue:** [#251](https://github.com/joe-bor/FamilyHub/issues/251)

---

## File Structure

**Create:**
- `src/components/shared/floating-action-layout.ts` — layout tokens (`MOBILE_FAB_BOTTOM_OFFSET`, `MOBILE_FAB_SCROLL_PADDING`), moved from calendar.
- `src/components/shared/floating-action-button.tsx` — shared presentational FAB.
- `src/components/shared/floating-action-button.test.tsx` — unit test.
- `e2e/mobile-fab.spec.ts` — per-module FAB presence/label + bottom-nav clearance geometry.

**Modify:**
- `src/components/calendar/components/floating-action-layout.ts` — becomes a re-export shim.
- `src/components/calendar/components/add-event-button.tsx` — wrap `FloatingActionButton`.
- `src/components/shared/index.ts` — export `FloatingActionButton`.
- `src/components/lists-view.tsx` (+ `lists-view.test.tsx`) — landing FAB.
- `src/components/lists/list-detail-view.tsx` (+ `lists/list-detail-view.test.tsx`) — detail FAB.
- `src/components/chores-view.tsx` (+ `chores-view.test.tsx`) — chores FAB.
- `src/components/recipes-view.tsx` (+ `recipes-view.test.tsx`) — recipes FAB.
- `e2e/mobile-lists.spec.ts` — rename landing trigger `New List` → `Create list`, scope sheet submit to its dialog.

**Conventions captured from the codebase:**
- `Button` (`@/components/ui/button.tsx`) already wires `usePressable` → press scale + tint + `haptics.tap()`. Building the FAB on `Button` inherits press feedback + haptics. Do **not** re-add them.
- Module component tests mock mobile via `const viewport = vi.hoisted(() => ({ isMobile: false }))` + `vi.mock("@/hooks", …)` overriding `useIsMobile: () => viewport.isMobile`. (`@/hooks` mocking is proven; the `@/api` preload gotcha does not apply here.)
- The shared FAB's own unit test mirrors `add-event-button.test.tsx`'s `setViewportWidth` matchMedia helper (it exercises the real `useIsMobile`).
- Test runner: `npm test -- --run <path>`. Lint: `npm run lint`. Type-check/build: `npm run build`.

---

## Task 1: Shared `FloatingActionButton` + layout tokens + Calendar compat

**Files:**
- Create: `src/components/shared/floating-action-layout.ts`
- Create: `src/components/shared/floating-action-button.tsx`
- Create: `src/components/shared/floating-action-button.test.tsx`
- Modify: `src/components/shared/index.ts`
- Modify: `src/components/calendar/components/floating-action-layout.ts`
- Modify: `src/components/calendar/components/add-event-button.tsx`

- [ ] **Step 1: Write the failing test** — `src/components/shared/floating-action-button.test.tsx`

```tsx
import { render, renderWithUser, screen } from "@/test/test-utils";
import { FloatingActionButton } from "./floating-action-button";

function setViewportWidth(width: number) {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: width,
  });

  vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
    matches: (() => {
      const maxWidth = Number.parseInt(
        query.match(/max-width:\s*(\d+)px/)?.[1] ?? "",
        10,
      );
      const minWidth = Number.parseInt(
        query.match(/min-width:\s*(\d+)px/)?.[1] ?? "",
        10,
      );
      const matchesMax = Number.isNaN(maxWidth) || width <= maxWidth;
      const matchesMin = Number.isNaN(minWidth) || width >= minWidth;
      return matchesMax && matchesMin;
    })(),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

describe("FloatingActionButton", () => {
  it("renders a button with the provided accessible label", () => {
    setViewportWidth(768);
    render(<FloatingActionButton onClick={vi.fn()} label="Add recipe" />);
    expect(
      screen.getByRole("button", { name: "Add recipe" }),
    ).toBeInTheDocument();
  });

  it("fires onClick when pressed", async () => {
    setViewportWidth(768);
    const onClick = vi.fn();
    const { user } = renderWithUser(
      <FloatingActionButton onClick={onClick} label="Create list" />,
    );
    await user.click(screen.getByRole("button", { name: "Create list" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("uses the mobile bottom offset at 768px so it clears the bottom nav", () => {
    setViewportWidth(768);
    render(<FloatingActionButton onClick={vi.fn()} label="Add item" />);
    expect(screen.getByRole("button", { name: "Add item" })).toHaveStyle({
      bottom: "max(4.5rem, calc(env(safe-area-inset-bottom) + 4.5rem))",
    });
  });

  it("uses the desktop bottom offset above the mobile breakpoint", () => {
    setViewportWidth(769);
    render(<FloatingActionButton onClick={vi.fn()} label="Add item" />);
    expect(screen.getByRole("button", { name: "Add item" })).toHaveStyle({
      bottom: "max(2rem, calc(env(safe-area-inset-bottom) + 1rem))",
    });
  });

  it("can be disabled and keeps its accessible name", () => {
    setViewportWidth(768);
    render(
      <FloatingActionButton
        onClick={vi.fn()}
        label="Add recurring chore"
        disabled
      />,
    );
    expect(
      screen.getByRole("button", { name: "Add recurring chore" }),
    ).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/components/shared/floating-action-button.test.tsx`
Expected: FAIL — cannot resolve `./floating-action-button`.

- [ ] **Step 3: Create the layout tokens** — `src/components/shared/floating-action-layout.ts`

```ts
export const MOBILE_FAB_BOTTOM_OFFSET =
  "max(4.5rem, calc(env(safe-area-inset-bottom) + 4.5rem))";

export const MOBILE_FAB_SCROLL_PADDING =
  "max(8.5rem, calc(env(safe-area-inset-bottom) + 8.5rem))";
```

- [ ] **Step 4: Create the component** — `src/components/shared/floating-action-button.tsx`

```tsx
import { type LucideIcon, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks";
import { MOBILE_FAB_BOTTOM_OFFSET } from "./floating-action-layout";

interface FloatingActionButtonProps {
  /** Action to run when the FAB is pressed. */
  onClick: () => void;
  /** Context-specific accessible name (e.g. "Add recipe"). */
  label: string;
  /** Icon to render; defaults to a plus. */
  icon?: LucideIcon;
  /** Module-specific gating; keeps the accessible name when disabled. */
  disabled?: boolean;
}

/**
 * Shared mobile creation FAB. Owns presentation/layout only — position,
 * size, bottom-nav/safe-area clearance, z-index. Press feedback and haptics
 * come from the underlying `Button`. Modules own the action and label, and
 * decide whether/when to render it.
 */
export function FloatingActionButton({
  onClick,
  label,
  icon: Icon = Plus,
  disabled = false,
}: FloatingActionButtonProps) {
  const isMobile = useIsMobile();

  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      className="fixed right-8 z-40 w-14 h-14 rounded-full bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all"
      style={{
        bottom: isMobile
          ? MOBILE_FAB_BOTTOM_OFFSET
          : "max(2rem, calc(env(safe-area-inset-bottom) + 1rem))",
      }}
      size="icon"
      aria-label={label}
    >
      <Icon className="h-7 w-7 text-primary-foreground" />
    </Button>
  );
}
```

- [ ] **Step 5: Export from the shared barrel** — `src/components/shared/index.ts`

Add (keep alphabetical ordering):

```ts
export { FloatingActionButton } from "./floating-action-button";
```

- [ ] **Step 6: Run the new test to verify it passes**

Run: `npm test -- --run src/components/shared/floating-action-button.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 7: Make the calendar layout file a re-export shim** — `src/components/calendar/components/floating-action-layout.ts`

Replace the entire file contents with:

```ts
export {
  MOBILE_FAB_BOTTOM_OFFSET,
  MOBILE_FAB_SCROLL_PADDING,
} from "@/components/shared/floating-action-layout";
```

This keeps the four calendar mobile views and `add-event-button.tsx`'s existing import paths valid with no behavior change.

- [ ] **Step 8: Refactor `AddEventButton` to wrap the shared FAB** — `src/components/calendar/components/add-event-button.tsx`

Replace the entire file contents with:

```tsx
import { FloatingActionButton } from "@/components/shared";

interface AddEventButtonProps {
  onClick: () => void;
}

export function AddEventButton({ onClick }: AddEventButtonProps) {
  return <FloatingActionButton onClick={onClick} label="Add event" />;
}
```

- [ ] **Step 9: Verify calendar regression guard + lint + types**

Run: `npm test -- --run src/components/shared/floating-action-button.test.tsx src/components/calendar/components/add-event-button.test.tsx`
Expected: PASS — `add-event-button.test.tsx` still asserts the same mobile/desktop offsets (no regression).

Run: `npm run lint`
Expected: no errors for the touched files.

- [ ] **Step 10: Commit**

```bash
git add src/components/shared/floating-action-layout.ts \
  src/components/shared/floating-action-button.tsx \
  src/components/shared/floating-action-button.test.tsx \
  src/components/shared/index.ts \
  src/components/calendar/components/floating-action-layout.ts \
  src/components/calendar/components/add-event-button.tsx
git commit -m "feat(fab): extract shared FloatingActionButton used by calendar"
```

---

## Task 2: Lists landing FAB (Create list)

**Files:**
- Modify: `src/components/lists-view.tsx`
- Test: `src/components/lists-view.test.tsx`

- [ ] **Step 1: Add mobile-mock scaffolding + failing tests** — `src/components/lists-view.test.tsx`

At the top of the file (after imports, before the first `describe`), add:

```tsx
const viewport = vi.hoisted(() => ({ isMobile: false }));

vi.mock("@/hooks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/hooks")>();
  return {
    ...actual,
    useIsMobile: () => viewport.isMobile,
  };
});
```

**Critical:** add `viewport.isMobile = false;` to the file's **existing top-level `beforeEach`** (the one inside `describe("ListsView hub")`, ~line 123). The global `afterEach` uses `vi.clearAllMocks()`, which does NOT reset a `vi.mock` factory closure over a hoisted object — so without a top-level reset, a mobile test setting `viewport.isMobile = true` leaks into later desktop tests and breaks them. Then add a new describe:

```tsx
describe("ListsView create action placement", () => {
  beforeEach(() => {
    viewport.isMobile = false;
  });

  it("shows a Create list FAB and hides the inline New List on mobile landing", async () => {
    viewport.isMobile = true;
    renderWithUser(<ListsView />);
    expect(
      await screen.findByRole("button", { name: "Create list" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "New List" }),
    ).not.toBeInTheDocument();
  });

  it("keeps the inline New List button and shows no FAB on desktop", async () => {
    viewport.isMobile = false;
    renderWithUser(<ListsView />);
    expect(
      await screen.findByRole("button", { name: "New List" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Create list" }),
    ).not.toBeInTheDocument();
  });
});
```

> Note: existing tests in this file run at the new default `isMobile = false` (desktop), where `New List` still exists — they remain green.

- [ ] **Step 2: Run the new tests to verify they fail**

Run: `npm test -- --run src/components/lists-view.test.tsx -t "create action placement"`
Expected: FAIL — no `Create list` button on mobile; `New List` still present on mobile.

- [ ] **Step 3: Update imports** — `src/components/lists-view.tsx`

Add to the existing imports:

```tsx
import { FloatingActionButton, OfflineUnavailable, ScreenTransition } from "@/components/shared";
import { MOBILE_FAB_SCROLL_PADDING } from "@/components/shared/floating-action-layout";
```

(Merge `FloatingActionButton` into the existing `@/components/shared` import line.) Remove the now-unused `cn` import (see Step 5).

- [ ] **Step 4: Gate the header rows to desktop + add scroll padding**

In **both** the error-state branch and the loaded-state branch, replace the header row block:

```tsx
<div
  className={cn(
    "flex items-center gap-3",
    isMobile ? "justify-end" : "justify-between",
  )}
>
  {!isMobile && (
    <h2 className="text-[24px] font-semibold leading-8 text-foreground">
      My Lists
    </h2>
  )}
  <Button type="button" onClick={() => setCreateOpen(true)}>
    <Plus className="h-4 w-4" />
    New List
  </Button>
</div>
```

with a desktop-only header row:

```tsx
{!isMobile && (
  <div className="flex items-center justify-between gap-3">
    <h2 className="text-[24px] font-semibold leading-8 text-foreground">
      My Lists
    </h2>
    <Button type="button" onClick={() => setCreateOpen(true)}>
      <Plus className="h-4 w-4" />
      New List
    </Button>
  </div>
)}
```

In **both** landing scroll containers, add the mobile scroll padding:

```tsx
<div
  className="flex-1 overflow-y-auto p-4 sm:p-6"
  style={{ paddingBottom: isMobile ? MOBILE_FAB_SCROLL_PADDING : undefined }}
>
```

- [ ] **Step 5: Hoist the create sheet + FAB to the view root (dedupe)**

Delete the `<ListCreateSheet … />` instances inside the error-state branch and the loaded-state branch. Replace the component's final `return`:

```tsx
return (
  <ScreenTransition
    token={selectedListId ?? "__list__"}
    mode="slide"
    direction={selectedListId ? "forward" : "back"}
  >
    {body}
  </ScreenTransition>
);
```

with:

```tsx
return (
  <>
    <ScreenTransition
      token={selectedListId ?? "__list__"}
      mode="slide"
      direction={selectedListId ? "forward" : "back"}
    >
      {body}
    </ScreenTransition>
    {isMobile && selectedListId === null && (
      <FloatingActionButton
        label="Create list"
        onClick={() => setCreateOpen(true)}
      />
    )}
    <ListCreateSheet
      open={createOpen}
      onOpenChange={setCreateOpen}
      onCreated={(id) => setSelectedListId(id)}
    />
  </>
);
```

The empty-state "Create first list" CTA stays as-is. `cn` should now be unused — confirm and remove its import.

- [ ] **Step 6: Run tests + lint**

Run: `npm test -- --run src/components/lists-view.test.tsx`
Expected: PASS (existing + 2 new).
Run: `npm run lint`
Expected: no unused-import errors (notably `cn`).

- [ ] **Step 7: Commit**

```bash
git add src/components/lists-view.tsx src/components/lists-view.test.tsx
git commit -m "feat(lists): use shared FAB for create on mobile landing"
```

---

## Task 3: List detail FAB (Add item)

**Files:**
- Modify: `src/components/lists/list-detail-view.tsx`
- Test: `src/components/lists/list-detail-view.test.tsx`

This test file already has the `viewport` + `vi.mock("@/hooks")` scaffolding and `mobile`/`desktop` describe blocks.

- [ ] **Step 1: Add failing tests** — `src/components/lists/list-detail-view.test.tsx`

In the **mobile** describe block, add:

```tsx
it("shows an Add item FAB and removes the header Add item button", async () => {
  renderListDetail(); // use the file's existing render helper
  expect(
    await screen.findByRole("button", { name: "Add item" }),
  ).toBeVisible();
  // The options control remains available on mobile.
  expect(
    screen.getByRole("button", { name: "List options" }),
  ).toBeInTheDocument();
});
```

In the **desktop** describe block, add:

```tsx
it("keeps the inline Add item button and shows no extra FAB", async () => {
  renderListDetail();
  const addItem = await screen.findAllByRole("button", { name: "Add item" });
  expect(addItem).toHaveLength(1); // header button only, no separate FAB
});
```

> Match the existing render helper name/signature in this file (it wraps `renderWithUser`). On mobile the single "Add item" button is the FAB; on desktop it is the header button.

- [ ] **Step 2: Run the new tests to verify they fail**

Run: `npm test -- --run src/components/lists/list-detail-view.test.tsx -t "Add item"`
Expected: FAIL — on mobile there is currently a header "Add item" button (not a FAB) and no scroll-clearance; assertions about placement do not yet hold.

- [ ] **Step 3: Update imports** — `src/components/lists/list-detail-view.tsx`

```tsx
import { FloatingActionButton, MOBILE_FAB_SCROLL_PADDING } from "@/components/shared";
```

- [ ] **Step 4: Gate the header "Add item" to desktop**

Replace the header-card action cluster:

```tsx
<div className="flex shrink-0 items-center gap-2">
  <Button
    type="button"
    onClick={() => setItemSheet({ mode: "create", item: null })}
  >
    <Plus className="h-4 w-4" />
    Add item
  </Button>
  {isMobile && (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label="List options"
      className="h-11 w-11"
      onClick={() => setOptionsOpen(true)}
    >
      <SlidersHorizontal className="h-5 w-5" />
    </Button>
  )}
</div>
```

with (Add item desktop-only; options control unchanged on mobile):

```tsx
<div className="flex shrink-0 items-center gap-2">
  {!isMobile && (
    <Button
      type="button"
      onClick={() => setItemSheet({ mode: "create", item: null })}
    >
      <Plus className="h-4 w-4" />
      Add item
    </Button>
  )}
  {isMobile && (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label="List options"
      className="h-11 w-11"
      onClick={() => setOptionsOpen(true)}
    >
      <SlidersHorizontal className="h-5 w-5" />
    </Button>
  )}
</div>
```

- [ ] **Step 5: Add the mobile FAB + scroll padding to the loaded detail return**

Change the loaded-state outer container opening tag to add padding:

```tsx
<div
  className="flex-1 overflow-y-auto p-4 sm:p-6"
  style={{ paddingBottom: isMobile ? MOBILE_FAB_SCROLL_PADDING : undefined }}
>
```

Wrap that container and add the FAB. The loaded return becomes:

```tsx
return (
  <>
    <div
      className="flex-1 overflow-y-auto p-4 sm:p-6"
      style={{ paddingBottom: isMobile ? MOBILE_FAB_SCROLL_PADDING : undefined }}
    >
      {/* …existing detail content (back button, header card, items, sheets)… */}
    </div>
    {isMobile && (
      <FloatingActionButton
        label="Add item"
        onClick={() => setItemSheet({ mode: "create", item: null })}
      />
    )}
  </>
);
```

(The early `isLoading` and not-found returns are unchanged — no FAB there.)

- [ ] **Step 6: Run tests + lint**

Run: `npm test -- --run src/components/lists/list-detail-view.test.tsx`
Expected: PASS.
Run: `npm run lint`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add src/components/lists/list-detail-view.tsx src/components/lists/list-detail-view.test.tsx
git commit -m "feat(lists): use shared FAB for add item on mobile detail"
```

---

## Task 4: Chores FAB (Add recurring chore)

**Files:**
- Modify: `src/components/chores-view.tsx`
- Test: `src/components/chores-view.test.tsx`

This test file already has the `viewport` + `vi.mock("@/hooks")` scaffolding.

- [ ] **Step 1: Add failing tests** — `src/components/chores-view.test.tsx`

Add a describe (reusing the file's MSW/seed helpers):

```tsx
describe("ChoresView create action placement", () => {
  beforeEach(() => {
    viewport.isMobile = false;
  });

  it("shows the Add recurring chore FAB on mobile and enables it once a board loads", async () => {
    viewport.isMobile = true;
    seedMockChoresBoard(emptyChoresBoard());
    renderWithUser(<ChoresView />);
    const fab = await screen.findByRole("button", {
      name: "Add recurring chore",
    });
    await waitFor(() => expect(fab).toBeEnabled());
  });

  it("renders exactly one Add recurring chore control on desktop", async () => {
    viewport.isMobile = false;
    seedMockChoresBoard(emptyChoresBoard());
    renderWithUser(<ChoresView />);
    await waitFor(() =>
      expect(
        screen.getAllByRole("button", { name: "Add recurring chore" }),
      ).toHaveLength(1),
    );
  });
});
```

> The accessible name "Add recurring chore" is unchanged from the old icon button, so on each viewport exactly one control carries it (icon button on desktop, FAB on mobile).

- [ ] **Step 2: Run the new tests to verify they fail**

Run: `npm test -- --run src/components/chores-view.test.tsx -t "create action placement"`
Expected: FAIL — on mobile the only control is the header icon button (no FAB element distinct from the desktop one) until the change lands.

- [ ] **Step 3: Update imports** — `src/components/chores-view.tsx`

```tsx
import { FloatingActionButton, MOBILE_FAB_SCROLL_PADDING, OfflineUnavailable } from "@/components/shared";
```

(Merge `FloatingActionButton` and `MOBILE_FAB_SCROLL_PADDING` into the existing `@/components/shared` import.)

- [ ] **Step 4: Gate the header icon button to desktop**

Replace:

```tsx
<Button
  type="button"
  aria-label="Add recurring chore"
  size="icon"
  disabled={!canCreate}
  onClick={() => setCreateOpen(true)}
>
  <Plus className="h-5 w-5" />
</Button>
```

with:

```tsx
{!isMobile && (
  <Button
    type="button"
    aria-label="Add recurring chore"
    size="icon"
    disabled={!canCreate}
    onClick={() => setCreateOpen(true)}
  >
    <Plus className="h-5 w-5" />
  </Button>
)}
```

- [ ] **Step 5: Add scroll padding + the mobile FAB**

Change the scroll container opening tag:

```tsx
<div
  className="flex-1 overflow-y-auto p-4 sm:p-6"
  style={{ paddingBottom: isMobile ? MOBILE_FAB_SCROLL_PADDING : undefined }}
>
```

Add the FAB next to `<ChoreFormSheet … />` (inside the top-level fragment):

```tsx
{isMobile && (
  <FloatingActionButton
    label="Add recurring chore"
    disabled={!canCreate}
    onClick={() => setCreateOpen(true)}
  />
)}
```

- [ ] **Step 6: Run tests + lint**

Run: `npm test -- --run src/components/chores-view.test.tsx`
Expected: PASS.
Run: `npm run lint`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add src/components/chores-view.tsx src/components/chores-view.test.tsx
git commit -m "feat(chores): use shared FAB for add chore on mobile"
```

---

## Task 5: Recipes FAB (Add recipe)

**Files:**
- Modify: `src/components/recipes-view.tsx`
- Test: `src/components/recipes-view.test.tsx`

- [ ] **Step 1: Add mobile-mock scaffolding + failing tests** — `src/components/recipes-view.test.tsx`

At the top (after imports, before first `describe`), add:

```tsx
const viewport = vi.hoisted(() => ({ isMobile: false }));

vi.mock("@/hooks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/hooks")>();
  return {
    ...actual,
    useIsMobile: () => viewport.isMobile,
  };
});
```

**Critical (two fixes to the existing file):**
1. Add `waitFor` to the existing `@/test/test-utils` import — the new tests below use it and the file does not currently import it (compile error otherwise).
2. Add `viewport.isMobile = false;` to the file's **existing top-level `beforeEach`** (inside `describe("RecipesView")`, ~line 33, alongside the current `vi.restoreAllMocks()`). The global `afterEach` uses `vi.clearAllMocks()`, which does NOT reset a `vi.mock` factory closure — so a mobile test setting `viewport.isMobile = true` would leak into the ~50 existing desktop tests and break them.

Then add a describe:

```tsx
describe("RecipesView create action placement", () => {
  beforeEach(() => {
    viewport.isMobile = false;
  });

  it("shows the Add recipe FAB in the library on mobile", async () => {
    viewport.isMobile = true;
    renderWithUser(<RecipesView />);
    expect(
      await screen.findByRole("button", { name: "Add recipe" }),
    ).toBeVisible();
  });

  it("renders exactly one Add recipe control on desktop library", async () => {
    viewport.isMobile = false;
    renderWithUser(<RecipesView />);
    await waitFor(() =>
      expect(
        screen.getAllByRole("button", { name: "Add recipe" }),
      ).toHaveLength(1),
    );
  });
});
```

> "Add recipe" is unchanged from the old inline button, so exactly one control carries it per viewport. Recipe-detail (no FAB) is already covered by the gate `selectedRecipeId === null`; existing detail tests assert the inline "Add recipe" disappears in detail and continue to pass.

- [ ] **Step 2: Run the new tests to verify they fail**

Run: `npm test -- --run src/components/recipes-view.test.tsx -t "create action placement"`
Expected: FAIL — on mobile the inline button currently renders in the header row, not as a FAB; the assertions about a fixed FAB plus the desktop-only header do not hold yet.

- [ ] **Step 3: Update imports** — `src/components/recipes-view.tsx`

```tsx
import { FloatingActionButton, MOBILE_FAB_SCROLL_PADDING, OfflineUnavailable, ScreenTransition } from "@/components/shared";
```

(Merge `FloatingActionButton` and `MOBILE_FAB_SCROLL_PADDING` into the existing `@/components/shared` import.)

- [ ] **Step 4: Make the header row desktop-only + add scroll padding**

Replace the header row:

```tsx
<div
  className={cn(
    "flex items-start gap-3",
    isMobile ? "justify-end" : "justify-between",
  )}
>
  {/* Title is redundant with the mobile header; desktop keeps it. */}
  {!isMobile && (
    <div>
      <h1 className="text-2xl font-semibold text-foreground">Recipes</h1>
      <p className="text-sm text-muted-foreground">
        Save family favorites and discover what to cook next.
      </p>
    </div>
  )}
  {selectedRecipeId === null ? (
    <Button type="button" onClick={() => setIsCreateSheetOpen(true)}>
      Add recipe
    </Button>
  ) : null}
</div>
```

with:

```tsx
{!isMobile && (
  <div className="flex items-start justify-between gap-3">
    <div>
      <h1 className="text-2xl font-semibold text-foreground">Recipes</h1>
      <p className="text-sm text-muted-foreground">
        Save family favorites and discover what to cook next.
      </p>
    </div>
    {selectedRecipeId === null ? (
      <Button type="button" onClick={() => setIsCreateSheetOpen(true)}>
        Add recipe
      </Button>
    ) : null}
  </div>
)}
```

Change the outer `<section>` opening tag to add padding:

```tsx
<section
  className="flex-1 overflow-y-auto p-4 sm:p-6"
  style={{ paddingBottom: isMobile ? MOBILE_FAB_SCROLL_PADDING : undefined }}
>
```

- [ ] **Step 5: Add the mobile FAB (library only)**

Just before the closing `</section>`, add:

```tsx
{isMobile && selectedRecipeId === null && (
  <FloatingActionButton
    label="Add recipe"
    onClick={() => setIsCreateSheetOpen(true)}
  />
)}
```

`cn` is still used elsewhere in this file (e.g. the recipe card wrapper) — keep its import.

- [ ] **Step 6: Run tests + lint**

Run: `npm test -- --run src/components/recipes-view.test.tsx`
Expected: PASS.
Run: `npm run lint`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add src/components/recipes-view.tsx src/components/recipes-view.test.tsx
git commit -m "feat(recipes): use shared FAB for add recipe on mobile"
```

---

## Task 6: E2E — mobile creation flows + bottom-nav clearance

**Files:**
- Modify: `e2e/mobile-lists.spec.ts`
- Create: `e2e/mobile-fab.spec.ts`

Chores and Recipes mobile specs need no change: their FAB accessible names ("Add recurring chore", "Add recipe") are identical to the old controls, so the existing "opening the creation flow" coverage still holds.

- [ ] **Step 1: Update the Lists landing trigger** — `e2e/mobile-lists.spec.ts`

The landing create control is now the FAB labeled **Create list**, and the create sheet (dialog titled **New List**) still has a **Create list** submit button — so the submit must be scoped to its dialog to avoid ambiguity.

Replace:

```ts
await page.getByRole("button", { name: "New List" }).click();
await page.getByLabel("List name").fill("Trader Joe's Run");
await page.getByRole("radio", { name: "Grocery" }).click();
await page.getByRole("button", { name: "Create list" }).click();
```

with:

```ts
await page.getByRole("button", { name: "Create list" }).click();
const createDialog = page.getByRole("dialog", { name: "New List" });
await expect(createDialog).toBeVisible();
await createDialog.getByLabel("List name").fill("Trader Joe's Run");
await createDialog.getByRole("radio", { name: "Grocery" }).click();
await createDialog.getByRole("button", { name: "Create list" }).click();
```

The later `getByRole("button", { name: "Add item" })` usage is unchanged — on mobile detail it now resolves to the FAB (same name), and the item sheet's submit is "Save item" (no collision).

- [ ] **Step 2: Create the clearance spec** — `e2e/mobile-fab.spec.ts`

```ts
import { expect, test } from "@playwright/test";
import { registerFamily, seedBrowserAuth } from "./helpers/api-helpers";
import { clearStorage, waitForHydration } from "./helpers/test-helpers";

/**
 * The shared mobile FAB must clear the persistent bottom nav and stay within
 * the viewport at the supported mobile width. We assert geometry rather than
 * pixels: the FAB's bottom edge sits at or above the nav's top edge.
 */
test.describe("Mobile creation FAB", () => {
  test.beforeEach(async ({ page, request, isMobile }) => {
    test.skip(!isMobile, "Mobile-only tests");
    await page.goto("/");
    await clearStorage(page);

    const registration = await registerFamily(request, {
      familyName: "FAB E2E Family",
      members: [{ name: "Robin", color: "coral" }],
    });
    await seedBrowserAuth(page, registration);
    await page.reload();
    await waitForHydration(page);
  });

  async function expectFabClearsNav(page, fabName: string) {
    const nav = page.getByRole("navigation", { name: /primary/i });
    const fab = page.getByRole("button", { name: fabName });
    await expect(fab).toBeVisible();

    const fabBox = await fab.boundingBox();
    const navBox = await nav.boundingBox();
    const viewport = page.viewportSize();
    if (!fabBox || !navBox || !viewport) throw new Error("missing geometry");

    // FAB sits fully above the bottom nav (small tolerance for rounding).
    expect(fabBox.y + fabBox.height).toBeLessThanOrEqual(navBox.y + 1);
    // FAB stays within the viewport horizontally.
    expect(fabBox.x + fabBox.width).toBeLessThanOrEqual(viewport.width);
  }

  test("Lists landing FAB clears the bottom nav", async ({ page }) => {
    await page
      .getByRole("navigation", { name: /primary/i })
      .getByRole("button", { name: "Lists" })
      .click();
    await expectFabClearsNav(page, "Create list");
  });

  test("Chores FAB clears the bottom nav", async ({ page }) => {
    await page
      .getByRole("navigation", { name: /primary/i })
      .getByRole("button", { name: "Chores" })
      .click();
    await expectFabClearsNav(page, "Add recurring chore");
  });

  test("Recipes library FAB clears the bottom nav", async ({ page }) => {
    const nav = page.getByRole("navigation", { name: /primary/i });
    await nav.getByRole("button", { name: "More" }).click();
    const moreSheet = page.getByRole("dialog", { name: "More" });
    await moreSheet.getByRole("button", { name: "Recipes" }).click();
    await expect(moreSheet).toBeHidden();
    await expectFabClearsNav(page, "Add recipe");
  });
});
```

> If the repo lints E2E with TypeScript-strict `page` typing, import `type { Page } from "@playwright/test"` and annotate the `expectFabClearsNav(page: Page, …)` parameter.

- [ ] **Step 3: Type-check / lint the specs**

Run: `npm run lint`
Expected: clean (Biome covers `e2e/`).

- [ ] **Step 4: Run the affected E2E (requires the real backend)**

The FE E2E suite hits the real backend through the Vite proxy. Run locally with the released backend image, e.g.:

```bash
BE_IMAGE_TAG=<latest-released-tag> docker compose up -d   # from the workspace that provides the compose file
npm run test:e2e -- mobile-fab.spec.ts mobile-lists.spec.ts --project="Mobile Chrome"
```

Expected: the new clearance tests pass and the updated Lists flow passes. If the backend is unavailable in this environment, record that E2E was not executed locally and rely on CI (which resolves the released BE image) — do not claim E2E passed without evidence.

- [ ] **Step 5: Commit**

```bash
git add e2e/mobile-fab.spec.ts e2e/mobile-lists.spec.ts
git commit -m "test(e2e): cover mobile FAB creation flows and nav clearance"
```

---

## Final verification (after all tasks)

- [ ] `npm run lint` — clean.
- [ ] `npm test -- --run` — full unit/component suite green.
- [ ] `npm run build` — type-check passes (this is the only gate that catches FE type errors).
- [ ] Re-read the issue acceptance checklist and map each item to a task/test.

---

## Self-Review (spec coverage, placeholders, type consistency)

**Spec coverage vs. issue acceptance:**
- Lists landing FAB "Create list" + remove inline New List → Task 2. ✓
- List detail FAB "Add item" + remove header button, keep options → Task 3. ✓
- Chores FAB "Add recurring chore" + remove scope-switcher icon → Task 4. ✓
- Recipes library FAB "Add recipe" + remove action row → Task 5. ✓
- Recipe detail shows no FAB → gate `selectedRecipeId === null` (Task 5) + existing detail tests. ✓
- Calendar migrated/compatible, no regression → Task 1 (wrapper + existing test stays green). ✓
- FAB clears bottom nav + safe area at mobile widths → shared offset token (Task 1) + E2E geometry (Task 6). ✓
- Scrollable content bottom padding → `MOBILE_FAB_SCROLL_PADDING` applied per module (Tasks 2–5). ✓
- Disabled/read-only rules module-specific + accessible → Chores `disabled={!canCreate}` keeps aria-label (Tasks 1, 4). ✓
- ≥44px target, press feedback, optional haptics → `w-14 h-14` (56px) on `Button` w/ `usePressable` (Task 1). ✓
- Desktop unchanged → every module change is `isMobile`-gated; desktop branches untouched. ✓
- Component tests (visibility, labels, context) + mobile E2E (open flows + clearance) → Tasks 2–6. ✓

**Placeholder scan:** No TBD/TODO; every code step shows complete code; commands have expected output.

**Type consistency:** `FloatingActionButtonProps` = `{ onClick, label, icon?, disabled? }`, used consistently across calendar wrapper and all four modules. Tokens `MOBILE_FAB_BOTTOM_OFFSET` / `MOBILE_FAB_SCROLL_PADDING` named identically everywhere; calendar imports preserved via re-export shim.

**Known interaction handled:** FAB "Create list" vs. create-sheet submit "Create list" — disambiguated by scoping the submit to the `dialog[name="New List"]` (Task 6 E2E); component test for the landing does not open the sheet, so it is unambiguous.

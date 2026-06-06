# Meals Spec-Drift Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve the valid PR #187 spec-drift findings (B1, B2, B3, M2, M3, L1, L2, N2) so the Meals editor and board match `docs/superpowers/specs/2026-06-01-meals-and-recipes-foundation-design.md`, while keeping 100% test passage.

**Architecture:** Frontend-only. All write paths already exist on the released backend (`family-hub-api v1.5.0`): `upsertSlot` does a full primary+extras replace (or appends with `add_as_extra`), and `moveSlot`/`duplicateSlot` accept an arbitrary destination week/day/meal-type. The fixes are: (1) a meals-specific responsive breakpoint hook so the day-card↔grid switch has a single source of truth at `lg`; (2) editor affordances for replace, extras add/remove, slot-note editing; (3) a within-week destination picker for move/duplicate; (4) preserve the recipe placement draft across week navigation.

**Tech Stack:** React 19, TanStack Query v5, MSW v2, Vitest, Testing Library, TypeScript, Tailwind CSS v4.

**Spec:** `docs/superpowers/specs/2026-06-01-meals-and-recipes-foundation-design.md`

## Validity verdict (findings triaged before planning)

| Finding | Verdict | Evidence |
|---|---|---|
| B1 Replace meal missing | **Valid** | Editor has Move/Duplicate/View/Remove only. Spec "Editing a planned meal" lists "replace meal". |
| B2 Manage extras missing | **Valid** | Extras are read-only chips. Spec lists "manage extras or sides". |
| B3 Blank at 769–1023px | **Valid** | `useIsMobile`≤768 + grid `hidden lg:block` (≥1024) → both content paths absent 769–1023. |
| M2 Placement draft destroyed on week nav | **Valid** | `onWeekChange` calls `setPlacementDraft(null)`; spec "allow switching weeks if needed" during placement. |
| M3 Move targets next day, no chooser | **Valid** | `baseMoveRequest` hardcodes `nextDay`/same-type. Backend accepts any destination. |
| L1 Slot note not editable | **Valid** | Editor renders `activePrimary.note` read-only; no note edit affordance. |
| L2 Move/duplicate keep source meal type | **Valid** | `destinationMealType: activeSlot.mealType` hardcoded. Resolved with M3 picker. |
| N2 Redundant dual-guard on grid | **Valid** | `!isMobile` JS guard AND `hidden lg:block` CSS. Resolved with B3. |
| M1 View-recipe shown for deleted recipe | **Invalid** | `meal_slot_entry.recipe_id` is `ON DELETE SET NULL`; `MealMapper.toEntryDto` returns `recipeId: null` once deleted; editor gates the button on `recipeId`. Snapshot title/image persist. Already correct. |
| M4 weekStartDate/dayIndex not echoed | **Invalid** | `MealSlotResponse.java` includes `weekStartDate` + `dayIndex`; `MealMapper.toSlotDto` populates them. |
| N1 formatMealType duplicated | **Invalid** | Already extracted to `meal-type-utils.ts`; all four files import it. |

## Resolved design decisions (confirmed with user)

- **Move/duplicate (M3+L2):** add a within-visible-week destination picker (day select + meal-type select), default = next day / same type. Drops the implicit Saturday→next-week wrap in favor of explicit selection.
- **Extras (B2):** support both add (composer in extra-intent → `add_as_extra`) and remove (per-chip ×, re-saves the slot composition).
- **Tablet (B3):** day-cards below `1024px`, grid at `≥1024px`, via a new `useMediaQuery` hook. Removes the redundant CSS guard (N2).

## Known v1 constraint (documented, accepted)

`upsertSlot` re-snapshots recipe-backed entries from the live recipe. Therefore any editor "save composition" action (remove extra, edit note) re-sends the primary/extras and, for recipe-backed entries whose source recipe changed since placement, refreshes their snapshot. In the common case (recipe unchanged) this is a no-op. Recipe entries whose source was deleted (`recipeId === null`) are re-sent as `quick` to preserve the snapshot. Granular per-entry edit endpoints are out of scope.

## File Structure

- Create: `src/hooks/use-media-query.ts` — generic reactive media-query hook.
- Modify: `src/hooks/index.ts` — export `useMediaQuery`.
- Create: `src/components/meals/meal-move-picker.tsx` — day + meal-type destination dialog.
- Modify: `src/components/meals/meal-grid.tsx` — drop redundant `hidden lg:block`.
- Modify: `src/components/meals/meal-composer-sheet.tsx` — honor `intent: "extra"` (force `add_as_extra`, skip prompt, retitle).
- Modify: `src/components/meals/meal-slot-card.tsx` — show slot-level note when present.
- Modify: `src/components/meals/meal-editor-sheet.tsx` — replace/add-extra/remove-extra/note-edit + picker-driven move/duplicate.
- Modify: `src/components/meals-view.tsx` — breakpoint switch, preserve placement draft, wire `onReplace`/`onAddExtra`.
- Modify: `src/components/meals-view.test.tsx`, `src/components/meals/meal-composer-sheet.test.tsx` — tests.

---

### Task 1 — M2: preserve recipe placement draft across week navigation

**Files:**
- Modify: `src/components/meals-view.tsx`
- Modify: `src/components/meals-view.test.tsx`

- [ ] **Step 1: Write the failing test** (in `meals-view.test.tsx`, inside `describe("MealsView")`)

```tsx
it("keeps the recipe placement draft when navigating to another week", async () => {
  seedMockMealsBoard(createEmptyMealsBoard());
  seedMockMealsBoard(createEmptyMealsBoard("2026-06-14"));
  seedMockRecipes([testRecipeDetail]);
  useAppStore.getState().startMealPlacementFromRecipe({
    recipeId: testRecipeDetail.id,
    requestedAtWeekStartDate: testWeekStartDate,
    source: { kind: "recipes-library" },
  });

  const { user } = renderWithUser(<MealsView />);

  expect(
    await screen.findByText(`Choose a meal slot for ${testRecipeDetail.title}`),
  ).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Next week" }));

  expect(await screen.findByText("Jun 14 - Jun 20")).toBeInTheDocument();
  // Banner persists and empty slots still invite recipe placement on the new week
  expect(
    screen.getByText(`Choose a meal slot for ${testRecipeDetail.title}`),
  ).toBeInTheDocument();
  expect(
    (await screen.findAllByRole("button", { name: /add recipe to dinner/i }))[0],
  ).toBeInTheDocument();
});
```

- [ ] **Step 2: Run it to confirm it fails**

```bash
npm test -- --run src/components/meals-view.test.tsx -t "keeps the recipe placement draft"
```

Expected: FAIL — banner gone after navigation because `setPlacementDraft(null)` clears it.

- [ ] **Step 3: Stop clearing the placement draft on week change**

In `src/components/meals-view.tsx`, in the `WeekHeader` `onWeekChange` handler, remove the `setPlacementDraft(null)` line only:

```tsx
onWeekChange={(weekStartDate) => {
  setVisibleWeekStartDate(weekStartDate);
  setSelectedSlot(null);
  setEditingSlot(null);
  setEditingBoard(null);
}}
```

- [ ] **Step 4: Run the file**

```bash
npm test -- --run src/components/meals-view.test.tsx
```

Expected: PASS (new test + all existing).

- [ ] **Step 5: Commit**

```bash
git add src/components/meals-view.tsx src/components/meals-view.test.tsx
git commit -m "fix(meals): keep recipe placement draft when switching weeks"
```

---

### Task 2 — B3 + N2: align day-card↔grid switch to a single lg breakpoint

**Files:**
- Create: `src/hooks/use-media-query.ts`
- Modify: `src/hooks/index.ts`
- Modify: `src/components/meals/meal-grid.tsx`
- Modify: `src/components/meals-view.tsx`
- Modify: `src/components/meals-view.test.tsx`

- [ ] **Step 1: Create the hook**

```ts
// src/hooks/use-media-query.ts
import { useEffect, useState } from "react";

/**
 * Reactive media-query hook. Returns whether `query` currently matches.
 * SSR-safe: returns false when `window` is unavailable.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mq = window.matchMedia(query);
    const handler = (event: MediaQueryListEvent) => setMatches(event.matches);
    setMatches(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [query]);

  return matches;
}
```

- [ ] **Step 2: Export it** — in `src/hooks/index.ts` add:

```ts
export { useMediaQuery } from "./use-media-query";
```

- [ ] **Step 3: Update the test mock + grid regression test** in `meals-view.test.tsx`

Replace the hoisted viewport + mock:

```tsx
const viewport = vi.hoisted(() => ({ showGrid: false }));

vi.mock("@/hooks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/hooks")>();
  return {
    ...actual,
    useMediaQuery: () => viewport.showGrid,
  };
});
```

In `beforeEach`, replace `viewport.isMobile = true;` with `viewport.showGrid = false;`.

In the existing grid test ("renders a weekly meals grid on larger screens"), replace `viewport.isMobile = false;` with `viewport.showGrid = true;`.

Add a regression test (default `showGrid = false` = tablet/phone day-card layout):

```tsx
it("renders day cards (not a hidden grid) below the lg breakpoint", async () => {
  seedMockMealsBoard(createEmptyMealsBoard());

  renderWithUser(<MealsView />);

  // Day cards present below lg, so tablet portrait is never blank.
  expect(
    await screen.findAllByRole("button", { name: /add dinner/i }),
  ).toHaveLength(7);
  expect(
    screen.queryByRole("table", { name: "Weekly meals" }),
  ).not.toBeInTheDocument();
});
```

- [ ] **Step 4: Run it to confirm the new test passes against current code intent but the switch still uses isMobile**

```bash
npm test -- --run src/components/meals-view.test.tsx
```

Expected: FAIL — `MealsView` still calls `useIsMobile` (no longer mocked), so behavior is governed by real `window.innerWidth` instead of `viewport.showGrid`.

- [ ] **Step 5: Switch `MealsView` to the lg breakpoint**

In `src/components/meals-view.tsx`:
- Change the import `import { useIsMobile } from "@/hooks";` to `import { useMediaQuery } from "@/hooks";`.
- Replace `const isMobile = useIsMobile();` with:

```tsx
const showGrid = useMediaQuery("(min-width: 1024px)");
```

- Change the mobile day-card guard from `board.data?.data && isMobile` to `board.data?.data && !showGrid`.
- Change the grid guard from `board.data?.data && !isMobile` to `board.data?.data && showGrid`.

- [ ] **Step 6: Remove the redundant CSS guard on the grid (N2)**

In `src/components/meals/meal-grid.tsx`, change the outer wrapper:

```tsx
<div className="overflow-x-auto">
```

(was `className="hidden overflow-x-auto lg:block"`).

- [ ] **Step 7: Run the file**

```bash
npm test -- --run src/components/meals-view.test.tsx
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/hooks/use-media-query.ts src/hooks/index.ts src/components/meals/meal-grid.tsx src/components/meals-view.tsx src/components/meals-view.test.tsx
git commit -m "fix(meals): switch day-card/grid layout at lg to close tablet gap"
```

---

### Task 3 — B2 (add): composer extra-intent mode

**Files:**
- Modify: `src/components/meals/meal-composer-sheet.tsx`
- Modify: `src/components/meals/meal-composer-sheet.test.tsx`

- [ ] **Step 1: Write the failing test** (in `meal-composer-sheet.test.tsx`)

```tsx
it("adds a quick meal as an extra without a collision prompt in extra intent", async () => {
  const occupiedDinner = {
    ...createOccupiedMealsBoard().days[1].slots[2],
    intent: "extra" as const,
  };
  const onOpenChange = vi.fn();
  const { user } = renderComposer(occupiedDinner, onOpenChange);

  expect(screen.getByText("Add a side")).toBeInTheDocument();

  await user.type(screen.getByLabelText("Meal name"), "Garlic Bread");
  await user.click(screen.getByRole("button", { name: "Add side" }));

  await waitFor(() => {
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
  // No collision dialog appeared.
  expect(
    screen.queryByText("That slot already has a meal"),
  ).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run it to confirm failure**

```bash
npm test -- --run src/components/meals/meal-composer-sheet.test.tsx -t "extra intent"
```

Expected: FAIL — no "Add a side" title/button; current submit prompts collision.

- [ ] **Step 3: Honor `intent` in the composer**

In `src/components/meals/meal-composer-sheet.tsx`:

Extend the selection type:

```tsx
export type MealSlotSelection = MealSlot & {
  seededRecipeId?: string | null;
  intent?: "primary" | "extra";
};
```

After `const seededRecipeId = activeSlot.seededRecipeId ?? null;` add:

```tsx
const isExtraIntent = activeSlot.intent === "extra";
```

Replace the title line:

```tsx
const title = isExtraIntent
  ? `Add a side`
  : `Plan ${formatMealType(activeSlot.mealType)}`;
```

In `submitRequest`, force the extra path:

```tsx
function submitRequest(request: UpsertMealSlotRequest) {
  if (isExtraIntent) {
    upsertSlot.mutate({ ...request, collisionMode: "add_as_extra" });
    return;
  }
  if (activeSlot.primary && request.collisionMode === null) {
    setCollisionRequest(request);
    return;
  }

  upsertSlot.mutate(request);
}
```

Relabel the primary action buttons when in extra intent. Change the "Create quick meal" button label to use a variable, and the seeded-recipe button:

```tsx
// Seeded recipe button text:
{seededRecipeId ? (
  <Button
    type="button"
    className="w-full"
    disabled={upsertSlot.isPending}
    onClick={handleSeededRecipe}
  >
    {isExtraIntent ? "Add recipe as side" : "Add recipe to slot"}
  </Button>
) : null}

// Quick meal button text:
<Button
  type="button"
  variant="outline"
  disabled={!trimmedMealName || upsertSlot.isPending}
  onClick={handleCreateQuickMeal}
>
  {isExtraIntent ? "Add side" : "Create quick meal"}
</Button>
```

Note: `handleSelectRecipe` already routes through `submitRequest`, so picking a saved recipe in extra intent also appends as an extra automatically.

- [ ] **Step 4: Run the file**

```bash
npm test -- --run src/components/meals/meal-composer-sheet.test.tsx
```

Expected: PASS (new test + existing — existing tests pass no `intent`, so primary behavior is unchanged).

- [ ] **Step 5: Commit**

```bash
git add src/components/meals/meal-composer-sheet.tsx src/components/meals/meal-composer-sheet.test.tsx
git commit -m "feat(meals): add extra-intent mode to the meal composer"
```

---

### Task 4 — B1 + B2(add): Replace meal and Add extra editor actions

**Files:**
- Modify: `src/components/meals/meal-editor-sheet.tsx`
- Modify: `src/components/meals-view.tsx`
- Modify: `src/components/meals-view.test.tsx`

- [ ] **Step 1: Write the failing tests** (in `meals-view.test.tsx`)

Editor-level (callbacks fire):

```tsx
it("invokes replace and add-extra callbacks from the editor", async () => {
  const board = createOccupiedMealsBoard();
  seedMockMealsBoard(board);
  const onReplace = vi.fn();
  const onAddExtra = vi.fn();
  const { user } = renderWithUser(
    <MealEditorSheet
      isOpen
      slot={board.days[1].slots[2]}
      board={board}
      readOnly={false}
      onReplace={onReplace}
      onAddExtra={onAddExtra}
      onOpenChange={vi.fn()}
    />,
  );

  await user.click(screen.getByRole("button", { name: "Replace meal" }));
  expect(onReplace).toHaveBeenCalledTimes(1);

  await user.click(screen.getByRole("button", { name: "Add extra or side" }));
  expect(onAddExtra).toHaveBeenCalledTimes(1);
});
```

Integration (replace opens the composer through `MealsView`):

```tsx
it("opens the composer to replace an occupied slot", async () => {
  seedMockMealsBoard(createOccupiedMealsBoard());
  const { user } = renderWithUser(<MealsView />);

  await user.click(
    await screen.findByRole("button", { name: /open dinner: pasta/i }),
  );
  await user.click(screen.getByRole("button", { name: "Replace meal" }));

  await user.type(screen.getByLabelText("Meal name"), "Tacos");
  await user.click(screen.getByRole("button", { name: "Create quick meal" }));
  await user.click(screen.getByRole("button", { name: "Replace primary" }));

  await waitFor(() => {
    expect(
      getMockMealsBoard(testWeekStartDate).days[1].slots[2].primary?.title,
    ).toBe("Tacos");
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test -- --run src/components/meals-view.test.tsx -t "replace"
```

Expected: FAIL — no Replace/Add-extra buttons or props.

- [ ] **Step 3: Add the editor props + buttons**

In `src/components/meals/meal-editor-sheet.tsx`, extend `MealEditorSheetProps`:

```tsx
interface MealEditorSheetProps {
  isOpen: boolean;
  slot: MealSlot | null;
  board: MealBoard | null;
  readOnly: boolean;
  onReplace?: (slot: MealSlot) => void;
  onAddExtra?: (slot: MealSlot) => void;
  onOpenChange: (open: boolean) => void;
}
```

Destructure `onReplace` and `onAddExtra` in the component signature.

In the action button grid (the `<div className="grid gap-2 sm:grid-cols-2">`), add a Replace button as the first action and an Add-extra button. Place Replace before Move:

```tsx
<Button
  type="button"
  variant="outline"
  disabled={actionDisabled}
  onClick={() => onReplace?.(activeSlot)}
>
  Replace meal
</Button>
```

And after Duplicate (before the conditional View recipe / Remove), add:

```tsx
<Button
  type="button"
  variant="outline"
  disabled={actionDisabled}
  onClick={() => onAddExtra?.(activeSlot)}
>
  Add extra or side
</Button>
```

- [ ] **Step 4: Wire callbacks in `MealsView`**

In `src/components/meals-view.tsx`, add handlers and pass them to `MealEditorSheet`:

```tsx
function replaceFromEditor(slot: MealSlotSelection) {
  setEditingSlot(null);
  setEditingBoard(null);
  setSelectedSlot({ ...slot, intent: "primary" });
}

function addExtraFromEditor(slot: MealSlotSelection) {
  setEditingSlot(null);
  setEditingBoard(null);
  setSelectedSlot({ ...slot, intent: "extra" });
}
```

```tsx
<MealEditorSheet
  isOpen={editingSlot !== null}
  slot={editingSlot}
  board={editingBoard}
  readOnly={readOnly}
  onReplace={replaceFromEditor}
  onAddExtra={addExtraFromEditor}
  onOpenChange={(open) => {
    if (!open) {
      setEditingSlot(null);
      setEditingBoard(null);
    }
  }}
/>
```

(`editingSlot` is a `MealSlotSelection`, so passing it to the composer carries `intent`. `MealSlot` is assignable as the `onReplace`/`onAddExtra` arg.)

- [ ] **Step 5: Run the file**

```bash
npm test -- --run src/components/meals-view.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/meals/meal-editor-sheet.tsx src/components/meals-view.tsx src/components/meals-view.test.tsx
git commit -m "feat(meals): add Replace meal and Add extra editor actions"
```

---

### Task 5 — B2 (remove): remove an extra from the editor

**Files:**
- Modify: `src/components/meals/meal-editor-sheet.tsx`
- Modify: `src/components/meals-view.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
it("removes an extra from the editor", async () => {
  const board = createOccupiedMealsBoard(); // Monday dinner: Pasta + Salad extra
  seedMockMealsBoard(board);
  const { user } = renderWithUser(
    <MealEditorSheet
      isOpen
      slot={board.days[1].slots[2]}
      board={board}
      readOnly={false}
      onOpenChange={vi.fn()}
    />,
  );

  await user.click(screen.getByRole("button", { name: "Remove extra: Salad" }));

  await waitFor(() => {
    expect(
      getMockMealsBoard(testWeekStartDate).days[1].slots[2].extras,
    ).toHaveLength(0);
  });
  // Primary survives.
  expect(
    getMockMealsBoard(testWeekStartDate).days[1].slots[2].primary?.title,
  ).toBe("Pasta");
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test -- --run src/components/meals-view.test.tsx -t "removes an extra"
```

Expected: FAIL — no remove control.

- [ ] **Step 3: Add working-copy state + upsert + a remove control**

In `src/components/meals/meal-editor-sheet.tsx`:

Update the React import:

```tsx
import { useEffect, useState } from "react";
```

Add `useUpsertMealSlot`, `MealEntryRequest`, `MealSlotEntry`, `UpsertMealSlotRequest` to the existing `@/api` and `@/lib/types` imports.

Add a module-scope helper (below the existing top-level functions):

```tsx
function entryToRequest(entry: MealSlotEntry): MealEntryRequest {
  if (entry.sourceType === "recipe" && entry.recipeId) {
    return {
      sourceType: "recipe",
      recipeId: entry.recipeId,
      title: null,
      imageUrl: null,
      note: null,
    };
  }
  // quick entries, or recipe entries whose source was deleted: preserve the
  // stored snapshot as a quick entry so re-saving never drops content.
  return {
    sourceType: "quick",
    recipeId: null,
    title: entry.title,
    imageUrl: entry.imageUrl,
    note: entry.note,
  };
}
```

Inside the component, before the `if (!slot || !board || !slot.primary) return null;` early return, add working state seeded from the slot:

```tsx
const [workingExtras, setWorkingExtras] = useState<MealSlotEntry[]>(
  slot?.extras ?? [],
);
useEffect(() => {
  setWorkingExtras(slot?.extras ?? []);
}, [slot?.id, slot?.extras]);

const upsertSlot = useUpsertMealSlot({
  onError: () => setWorkingExtras(slot?.extras ?? []),
});
```

Add `upsertSlot.error` to the `mutationError` chain:

```tsx
const mutationError =
  moveSlot.error ??
  duplicateSlot.error ??
  removeSlot.error ??
  upsertSlot.error ??
  null;
```

Include `upsertSlot.isPending` in `actionDisabled`.

Add a save-composition helper inside the component:

```tsx
function saveComposition(nextExtras: MealSlotEntry[], nextNote: string | null) {
  const request: UpsertMealSlotRequest = {
    weekStartDate: activeSlot.weekStartDate,
    dayIndex: activeSlot.dayIndex,
    mealType: activeSlot.mealType,
    primary: entryToRequest(activePrimary),
    extras: nextExtras.map(entryToRequest),
    note: nextNote,
    collisionMode: "replace_primary",
  };
  upsertSlot.mutate(request);
}

function handleRemoveExtra(extraId: string) {
  const nextExtras = workingExtras.filter((extra) => extra.id !== extraId);
  setWorkingExtras(nextExtras);
  saveComposition(nextExtras, activeSlot.note);
}
```

Replace the read-only extras block (the `{activeSlot.extras.length > 0 ? ...}` chip list) so each chip carries a remove control and reads from `workingExtras`:

```tsx
{workingExtras.length > 0 ? (
  <div className="mt-3 flex flex-wrap gap-1">
    {workingExtras.map((extra) => (
      <span
        key={extra.id}
        className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground"
      >
        {extra.title}
        {!readOnly ? (
          <button
            type="button"
            aria-label={`Remove extra: ${extra.title}`}
            className="rounded-full p-0.5 hover:bg-secondary-foreground/10"
            disabled={actionDisabled}
            onClick={() => handleRemoveExtra(extra.id)}
          >
            <X className="h-3 w-3" />
          </button>
        ) : null}
      </span>
    ))}
  </div>
) : null}
```

Add the `X` icon import at the top:

```tsx
import { X } from "lucide-react";
```

- [ ] **Step 4: Run the file**

```bash
npm test -- --run src/components/meals-view.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/meals/meal-editor-sheet.tsx src/components/meals-view.test.tsx
git commit -m "feat(meals): remove extras from the planned-meal editor"
```

---

### Task 6 — L1: edit the slot-level meal note from the editor

**Files:**
- Modify: `src/components/meals/meal-editor-sheet.tsx`
- Modify: `src/components/meals/meal-slot-card.tsx`
- Modify: `src/components/meals-view.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
it("edits the slot note from the editor", async () => {
  const board = createOccupiedMealsBoard();
  seedMockMealsBoard(board);
  const { user } = renderWithUser(
    <MealEditorSheet
      isOpen
      slot={board.days[1].slots[2]}
      board={board}
      readOnly={false}
      onOpenChange={vi.fn()}
    />,
  );

  await user.click(screen.getByRole("button", { name: "Add meal note" }));
  await user.type(screen.getByLabelText("Meal note"), "Family favorite");
  await user.click(screen.getByRole("button", { name: "Save note" }));

  await waitFor(() => {
    expect(getMockMealsBoard(testWeekStartDate).days[1].slots[2].note).toBe(
      "Family favorite",
    );
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test -- --run src/components/meals-view.test.tsx -t "edits the slot note"
```

Expected: FAIL — no note edit affordance.

- [ ] **Step 3: Add note edit state + UI to the editor**

In `src/components/meals/meal-editor-sheet.tsx`, add note state to the working block (next to `workingExtras`):

```tsx
const [isEditingNote, setIsEditingNote] = useState(false);
const [noteDraft, setNoteDraft] = useState(slot?.note ?? "");
useEffect(() => {
  setNoteDraft(slot?.note ?? "");
  setIsEditingNote(false);
}, [slot?.id, slot?.note]);
```

Add a save handler:

```tsx
function handleSaveNote() {
  const nextNote = noteDraft.trim() || null;
  setIsEditingNote(false);
  saveComposition(workingExtras, nextNote);
}
```

In the primary card block (the `rounded-lg border ... p-4` div), after the extras chip list, render the slot-note editor. When `readOnly`, only show the note text (if any):

```tsx
{readOnly ? (
  activeSlot.note ? (
    <p className="mt-3 text-sm text-muted-foreground">{activeSlot.note}</p>
  ) : null
) : isEditingNote ? (
  <div className="mt-3 space-y-2">
    <label className="block space-y-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Meal note
      </span>
      <textarea
        aria-label="Meal note"
        value={noteDraft}
        onChange={(event) => setNoteDraft(event.target.value)}
        className="min-h-16 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
      />
    </label>
    <div className="flex gap-2">
      <Button
        type="button"
        size="sm"
        disabled={actionDisabled}
        onClick={handleSaveNote}
      >
        Save note
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => {
          setNoteDraft(activeSlot.note ?? "");
          setIsEditingNote(false);
        }}
      >
        Cancel
      </Button>
    </div>
  </div>
) : (
  <div className="mt-3">
    {activeSlot.note ? (
      <p className="text-sm text-muted-foreground">{activeSlot.note}</p>
    ) : null}
    <Button
      type="button"
      size="sm"
      variant="ghost"
      className="mt-1 px-0"
      onClick={() => setIsEditingNote(true)}
    >
      {activeSlot.note ? "Edit meal note" : "Add meal note"}
    </Button>
  </div>
)}
```

(If `Button` has no `size` variant in this codebase, drop the `size` prop — verify against `src/components/ui/button.tsx` during execution.)

- [ ] **Step 4: Surface the slot note on the board card**

In `src/components/meals/meal-slot-card.tsx`, after the primary `note` paragraph (the `slot.primary.note` block), add the slot-level note so the edit is visible on the board:

```tsx
{slot.note ? (
  <p className="mt-1 line-clamp-2 text-xs italic text-muted-foreground">
    {slot.note}
  </p>
) : null}
```

- [ ] **Step 5: Run the files**

```bash
npm test -- --run src/components/meals-view.test.tsx src/components/meals/meal-composer-sheet.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/meals/meal-editor-sheet.tsx src/components/meals/meal-slot-card.tsx src/components/meals-view.test.tsx
git commit -m "feat(meals): edit the slot-level meal note from the editor"
```

---

### Task 7 — M3 + L2: within-week destination picker for move/duplicate

**Files:**
- Create: `src/components/meals/meal-move-picker.tsx`
- Modify: `src/components/meals/meal-editor-sheet.tsx`
- Modify: `src/components/meals-view.test.tsx`

- [ ] **Step 1: Write the failing tests** (in `meals-view.test.tsx`)

Update the two existing collision tests to go through the picker:

```tsx
// in "prompts when moving into an occupied slot and move clears the source":
await user.click(screen.getByRole("button", { name: "Move meal" }));
await user.click(screen.getByRole("button", { name: "Move here" }));
expect(
  await screen.findByText("That slot already has a meal"),
).toBeInTheDocument();
// ...rest unchanged (Replace primary -> Monday cleared, Tuesday Pasta)
```

```tsx
// in "duplicates explicitly and can add the duplicate as an extra on collision":
await user.click(screen.getByRole("button", { name: "Duplicate meal" }));
await user.click(screen.getByRole("button", { name: "Duplicate here" }));
expect(
  await screen.findByText("That slot already has a meal"),
).toBeInTheDocument();
// ...rest unchanged (Add as extra)
```

Replace the "moves a Saturday meal..." test with a cross-day + cross-meal-type move:

```tsx
it("moves a planned meal to a chosen day and meal type", async () => {
  const board = createOccupiedMealsBoard(); // Monday dinner: Pasta + Salad
  seedMockMealsBoard(board);
  const { user } = renderWithUser(
    <MealEditorSheet
      isOpen
      slot={board.days[1].slots[2]}
      board={board}
      readOnly={false}
      onOpenChange={vi.fn()}
    />,
  );

  await user.click(screen.getByRole("button", { name: "Move meal" }));
  await user.selectOptions(screen.getByLabelText("Day"), "4"); // Thursday
  await user.selectOptions(screen.getByLabelText("Meal"), "lunch");
  await user.click(screen.getByRole("button", { name: "Move here" }));

  await waitFor(() => {
    const updated = getMockMealsBoard(testWeekStartDate);
    expect(updated.days[1].slots[2].primary).toBe(null);
    expect(updated.days[4].slots[1].primary?.title).toBe("Pasta");
    expect(updated.days[4].slots[1].extras.map((e) => e.title)).toEqual([
      "Salad",
    ]);
  });
});
```

Remove the now-obsolete `addWeeksLocal`/Saturday import expectations if any (the Saturday test is deleted).

- [ ] **Step 2: Run to confirm failure**

```bash
npm test -- --run src/components/meals-view.test.tsx
```

Expected: FAIL — no picker ("Move here"/Day/Meal controls).

- [ ] **Step 3: Create the picker component**

```tsx
// src/components/meals/meal-move-picker.tsx
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { parseLocalDate } from "@/lib/time-utils";
import type { MealBoard, MealType } from "@/lib/types";
import { formatMealType } from "./meal-type-utils";

const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner"];

function dayLabel(date: string) {
  return parseLocalDate(date).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

interface MealMoveTarget {
  dayIndex: number;
  mealType: MealType;
}

interface MealMovePickerProps {
  open: boolean;
  title: string;
  confirmLabel: string;
  board: MealBoard;
  source: MealMoveTarget;
  onConfirm: (target: MealMoveTarget) => void;
  onCancel: () => void;
}

export function MealMovePicker({
  open,
  title,
  confirmLabel,
  board,
  source,
  onConfirm,
  onCancel,
}: MealMovePickerProps) {
  const [dayIndex, setDayIndex] = useState((source.dayIndex + 1) % 7);
  const [mealType, setMealType] = useState<MealType>(source.mealType);

  useEffect(() => {
    setDayIndex((source.dayIndex + 1) % 7);
    setMealType(source.mealType);
  }, [source.dayIndex, source.mealType, open]);

  const isSameSlot =
    dayIndex === source.dayIndex && mealType === source.mealType;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Pick the day and meal for this block.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <label className="block space-y-1">
            <span className="text-sm font-semibold text-foreground">Day</span>
            <select
              aria-label="Day"
              value={dayIndex}
              onChange={(event) => setDayIndex(Number(event.target.value))}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
            >
              {board.days.map((day) => (
                <option key={day.dayIndex} value={day.dayIndex}>
                  {dayLabel(day.date)}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-semibold text-foreground">Meal</span>
            <select
              aria-label="Meal"
              value={mealType}
              onChange={(event) => setMealType(event.target.value as MealType)}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
            >
              {MEAL_TYPES.map((type) => (
                <option key={type} value={type}>
                  {formatMealType(type)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <DialogFooter className="flex-col sm:flex-row">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={isSameSlot}
            onClick={() => onConfirm({ dayIndex, mealType })}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: Rewire move/duplicate in the editor through the picker**

In `src/components/meals/meal-editor-sheet.tsx`:

- Remove the top-level `getDestination` and `findDestinationSlot` helpers and the now-unused `addWeeksLocal`, `formatLocalDate`, `parseLocalDate` imports.
- Remove `baseMoveRequest`, `handleMove`, `handleDuplicate`, and the `destinationSlot` derivation.
- Import the picker: `import { MealMovePicker } from "./meal-move-picker";`
- Add picker state and a confirm handler:

```tsx
const [mover, setMover] = useState<{ kind: "move" | "duplicate" } | null>(null);
```

```tsx
function confirmMoveTarget(target: { dayIndex: number; mealType: MealSlot["mealType"] }) {
  if (!mover) return;
  const kind = mover.kind;
  setMover(null);

  const request: MoveMealSlotRequest = {
    sourceWeekStartDate: activeSlot.weekStartDate,
    sourceDayIndex: activeSlot.dayIndex,
    sourceMealType: activeSlot.mealType,
    destinationWeekStartDate: activeBoard.weekStartDate,
    destinationDayIndex: target.dayIndex,
    destinationMealType: target.mealType,
    collisionMode: "replace_primary",
  };

  const destinationSlot = activeBoard.days[target.dayIndex]?.slots.find(
    (candidate) => candidate.mealType === target.mealType,
  );
  if (destinationSlot?.primary) {
    setPendingCollision({ kind, request });
    return;
  }

  if (kind === "move") {
    moveSlot.mutate(request);
  } else {
    duplicateSlot.mutate(request);
  }
}
```

- Point the Move/Duplicate buttons at the picker:

```tsx
<Button
  type="button"
  variant="outline"
  disabled={actionDisabled}
  onClick={() => setMover({ kind: "move" })}
>
  Move meal
</Button>
<Button
  type="button"
  variant="outline"
  disabled={actionDisabled}
  onClick={() => setMover({ kind: "duplicate" })}
>
  Duplicate meal
</Button>
```

- Render the picker after the collision `<Dialog>` (inside the fragment):

```tsx
<MealMovePicker
  open={mover !== null}
  title={mover?.kind === "duplicate" ? "Duplicate to" : "Move to"}
  confirmLabel={mover?.kind === "duplicate" ? "Duplicate here" : "Move here"}
  board={activeBoard}
  source={{ dayIndex: activeSlot.dayIndex, mealType: activeSlot.mealType }}
  onConfirm={confirmMoveTarget}
  onCancel={() => setMover(null)}
/>
```

`resolveCollision` is unchanged (it mutates `pendingCollision.request`).

- [ ] **Step 5: Run the file**

```bash
npm test -- --run src/components/meals-view.test.tsx
```

Expected: PASS (updated collision tests + new cross-day/cross-type move test + all others).

- [ ] **Step 6: Commit**

```bash
git add src/components/meals/meal-move-picker.tsx src/components/meals/meal-editor-sheet.tsx src/components/meals-view.test.tsx
git commit -m "feat(meals): add day/meal-type destination picker for move and duplicate"
```

---

### Task 8 — Full verification + push

- [ ] **Step 1: Typecheck + lint + full test suite**

```bash
npm run lint
npm run build
npm test -- --run
```

Expected: lint clean, type-check passes, all tests green.

- [ ] **Step 2: Update the work log** — append a short entry to `docs/superpowers/work-logs/2026-06-05-meals-frontend-foundation.md` summarizing the spec-drift fixes and the invalid findings (M1, M4, N1) with evidence.

- [ ] **Step 3: Commit docs**

```bash
git add docs/superpowers/plans/2026-06-05-meals-spec-drift-fixes.md docs/superpowers/work-logs/2026-06-05-meals-frontend-foundation.md
git commit -m "docs(meals): record spec-drift fix plan and triage"
```

- [ ] **Step 4: Push**

```bash
git push origin codex/meals-frontend-foundation
```

## Spec coverage checklist

- Replace meal (spec "Editing a planned meal") → Task 4
- Manage extras or sides → Tasks 3 (add), 5 (remove)
- Meal-specific note support → Task 6
- Duplicate / move / collision prompts (unchanged behavior preserved) → Task 7
- Tablet/larger-screen grid vs mobile day cards without blank gap → Task 2
- "Allow switching weeks if needed" during placement → Task 1
- Move destination + cross-meal-type choice → Task 7

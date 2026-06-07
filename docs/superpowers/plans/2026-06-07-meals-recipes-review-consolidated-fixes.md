# Meals + Recipes Consolidated Review Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to execute this plan task-by-task. Every task is TDD: write the failing test first, watch it fail, implement, watch it pass, commit. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve all *valid* findings from two independent feature reviews (Claude + Codex) of the Recipes + Meals modules, so behavior matches `docs/superpowers/specs/2026-06-01-meals-and-recipes-foundation-design.md`, with 100% test passage and no regressions.

**Owner decision already made (do not re-open):** Tapping a recipe-backed planned meal **keeps today's editor-first flow** — the meal editor opens first and "View recipe" reaches live recipe detail. The spec's "tap opens live detail" line is intentionally satisfied via the editor's View-recipe action. This decision shapes Task 3.

**Architecture:** Frontend-only. The released backend (`family-hub-api v1.5.0`) already supports every write path used here. The themes are: (1) make the meal editor read **live** board/slot data instead of a frozen snapshot so saves are reflected and collision checks are correct; (2) make past weeks genuinely reviewable; (3) remove dead/no-op cross-module affordances and restore the meals↔recipes handoffs (full-library pick, URL import); (4) route the composer through the existing (currently dead) Zod validation; (5) polish (image fallbacks, board retry, recipe-row removal, empty state, README).

**Tech Stack:** React 19, TanStack Query v5, MSW v2, Vitest, Testing Library, Zustand, Zod, Tailwind CSS v4, Biome.

**Spec:** `2026-06-01-meals-and-recipes-foundation-design.md` lives in the **root workspace repo** `joe-bor/family-hub` at `docs/superpowers/specs/` (i.e. `../docs/superpowers/specs/...` from this frontend repo in a full workspace clone). It is NOT checked into the frontend repo. This plan embeds the binding contract per task, so it is fully executable even if the root repo is unavailable; the spec link is for deeper context only. Spec line numbers cited below (e.g. "spec L296") refer to that file.
**Prior plan (context, on frontend `main`):** `docs/superpowers/plans/2026-06-05-meals-spec-drift-fixes.md`.

## Conventions (non-negotiable)

- Single feature branch: `fix/meals-recipes-review-consolidated`. Create it before Task 1.
- Conventional commits per task: `type(scope): description`. No AI attribution / co-author / "Generated with" footers.
- Dates/times: ALWAYS use `src/lib/time-utils.ts` (`parseLocalDate`, `formatLocalDate`, `getWeekStartSunday`, etc). Never `new Date("yyyy-mm-dd")` or `.toISOString()` for date keys.
- `cn()` from `@/lib/utils` for className merging. Import alias `@/` → `src/`.
- Zustand stores hold UI state only; server data stays in `@/api`.
- Test gotchas: async form fields need explicit `defaultValues` + `waitForMemberSelected`/`typeAndWait`; optimistic/cache-assertion tests need a `QueryClient` with `gcTime: Infinity`; stores auto-reset between tests (`seedCalendarStore`/`seedFamilyStore`/`seedAuthStore` and the meals/recipes seed helpers in `src/test`).
- After EACH task: `npm test -- --run <touched files>` green, then at the end run the full gate: `npm run build && npm run lint && npm test -- --run`.

## Validity triage (all confirmed against code before planning)

| ID | Finding | Source | Sev | Evidence | Task |
|----|---------|--------|-----|----------|------|
| C1 | Meal editor reads a **frozen** slot/board snapshot: a saved note isn't reflected (read view shows stale `activeSlot.note`), sequential edits (save note → remove extra) can overwrite with stale data, and move/duplicate collision checks run against the stale board | Claude (T1+T4) + Codex (stale slot prop) | **High** | `meals-view.tsx:84-88` freezes `editingBoard`; editor reads it at `meal-editor-sheet.tsx:303` (note) and `:173` (collision) | T1 |
| C11 | `useUpsertMealSlot` writes a partial slot into the board cache and then invalidates the same key. That write is not automatically wrong — it can provide immediate UI while refetch catches up — but it can be misleading after collision/extra side-effects and must be audited after the live-editor fix | Claude (T5), severity adjusted during verification | Low cleanup | `use-meals.ts:77-81` | T1b |
| C2 | Past **occupied** meal slots can't be opened for review (button `disabled={readOnly}`), so notes/extras/recipe of past meals are not reviewable — spec requires past weeks browsable for review | Codex (past reviewability) | **High** | `meal-slot-card.tsx:32`; spec "Past weeks" L429-431 | T2 |
| C3 | In the editor's embedded `RecipeDetailView`, Edit / Favorite / Add-to-Meals are wired to `() => undefined` — live-looking buttons that do nothing | Claude (S2) + Codex (no-op embedded actions) | Med | `meal-editor-sheet.tsx:212-214`; `recipe-detail-view.tsx:126-150` renders them unconditionally | T3 |
| C4 | Composer "Browse recipe library" only switches modules and drops the active slot/week, so it isn't a real full-library picker for the slot being planned | Codex (orchestrator) | Med | `meal-composer-sheet.tsx:287-297`; spec "entry point into the full recipe library" L230 | T4 |
| C5 | Meals-origin "Create recipe from this" forces manual mode, so URL import is unreachable from the meals handoff | Codex (C-P2) | Med | `recipes-view.tsx:140` `recipeCreationDraft ? "manual" : "choices"` | T5 |
| C6 | Composer hand-builds payloads and bypasses the **tested** Zod schemas in `lib/validations/meals.ts` (which are otherwise dead); an invalid image URL / over-long title is sent raw; a typed note is silently dropped on recipe placement instead of becoming the slot-level meal note | Claude (T2+S5) + Codex (C-T3), note target clarified during verification | Med | `meal-composer-sheet.tsx:135-183`; schemas only imported by `lib/validations/index.ts` | T6 |
| C7 | Broken image URLs render the browser broken-image glyph (no `onError` fallback) in recipe library card, recipe detail, and recipe match list — only `meal-slot-card` has the fallback | Claude (T3) | Low | `recipe-library-card.tsx:30`, `recipe-detail-view.tsx:45`, `recipe-match-list.tsx:30` vs `meal-slot-card.tsx:36-41` | T7 |
| C8 | Meals board error state has no Retry, unlike Recipes | Codex (C-T5) | Low | `meals-view.tsx:141-152` (no retry) vs `recipes-view.tsx:252-262` | T8 |
| C9 | Recipe form array fields (ingredients, instructions, and tags) have Add but no per-row Remove | Codex (C-P4), scope clarified during verification | Low | `recipe-form.tsx:42-89` (`onAdd` only) | T9 |
| C10 | Recipes empty state has invite copy but no "Add your first recipe" button | Claude (S4) | Low | `recipes-view.tsx:276-284` | T10 |
| C12 | README module-status table + version line are stale, and it links to the deleted `docs/ROADMAP.md` | Codex (C-P5) | Low | `README.md:55-65` (Meals "🎨 UI ready", broken ROADMAP link) | T11 |

### Deferred / no action (documented, intentionally out of scope)

- **D1 — Multi-column recipe grid on large screens** (Claude S3): spec says larger screens "*can*" expand — permissive, not required. Leave single-column; revisit in a future UI polish pass.
- **D2 — Cross-week move/duplicate unreachable from UI** (Claude T7): intentional per `2026-06-05-meals-spec-drift-fixes.md` (M3 chose an explicit within-week picker). Hook-level cross-week tests are defensive; keep them. No action.
- **D3 — Recipe array visual floor**: preserve the current `DEFAULT_LINE_COUNT = 2` visual affordance for blank entry fields. Row removal may reduce the underlying submitted array to empty, because name-only recipes are valid; the form should still render two blank rows after an array becomes empty.

---

## Phase 1 — Data integrity & reviewability

### Task 1 — C1: meal editor reads live board/slot data, not a frozen snapshot

**Files:**
- Modify: `src/components/meals-view.tsx`
- Modify: `src/components/meals/meal-editor-sheet.tsx`
- Modify: `src/components/meals-view.test.tsx`
- Modify (if needed): `src/components/meals/meal-editor-sheet` tests

**Problem:** `MealsView.selectSlot` captures `editingSlot`/`editingBoard` once at open (`meals-view.tsx:84-88`). The editor (`meal-editor-sheet.tsx`) then:
- shows the note from the frozen `activeSlot.note` (`:303`) — after a successful in-place note save (upsert keeps the sheet open) the read view still shows the OLD note;
- decides move/duplicate collisions from the frozen `activeBoard` (`:173`) — a destination whose occupancy changed since open is misjudged;
- on upsert error resets only `workingExtras` (`:106`), never the note draft.

**Contract (target behavior):**
1. While the editor is open, the slot it displays (`note`, `extras`, `primary`) reflects the **current** board query for that week, not a value frozen at open.
2. The editor identifies its slot by `{weekStartDate, dayIndex, mealType}` and looks the slot up from the live board each render.
3. Local component state is used ONLY for in-progress drafts (`noteDraft`, `isEditingNote`, and any pending-extra UI). After a successful save, the displayed note/extras come from the refreshed server data.
4. Move/duplicate collision detection reads the **live** board.
5. On upsert error, both extras and note draft state are restored to the live slot values.
6. The editor must NOT blank out / unmount mid-edit when the board revalidates in the background (this is why the snapshot was originally added in commit `01b1c4d`). If the slot still exists in the refreshed board, keep showing it; if it was removed, the editor closes (remove already closes via `onSuccess`).

**Approach (unambiguous):**
- Change `MealsView` to track `editingSlotId: { weekStartDate; dayIndex; mealType } | null` instead of a frozen `editingSlot` + `editingBoard`. Pass the **live** `board.data?.data` and `editingSlotId` to `MealEditorSheet`.
- In `MealEditorSheet`, derive `activeBoard = board`, then `activeSlot = activeBoard.days[id.dayIndex]?.slots.find(s => s.mealType === id.mealType)`. Render nothing (return null) only when `activeBoard`/`activeSlot`/`activeSlot.primary` is missing.
- Remove the `workingExtras` local mirror as the display source; render extras from `activeSlot.extras`. Removing an extra calls `saveComposition(activeSlot.extras.filter(...), activeSlot.note)`; after success the live board refetch updates the chips. (Keep a disabled/pending visual via `upsertSlot.isPending` instead of optimistic local removal.)
- Drive the read-mode note from `activeSlot.note`; keep `noteDraft`/`isEditingNote` purely for the edit form. Reset both on `upsertSlot.onError`.
- The `onReplace`/`onAddExtra` callbacks still hand a slot identity back to `MealsView`; update their signatures to accept the live slot derived in the editor (or the id) — keep the composer hand-off working.

- [ ] **Step 1: Failing tests** in `meals-view.test.tsx` (inside `describe("MealsView")`), driving the full integration (editor opened from the board, real MSW board mutations):
  - "reflects a saved meal note in the editor without reopening": seed an occupied board, open the editor, add a note via "Add meal note" → "Save note", assert the read view now shows the saved note text (not the old/empty value) while the sheet stays open.
  - "does not lose the editor when the board revalidates": open editor, trigger a board `invalidateQueries`/refetch (e.g., via a sibling mutation or `queryClient.invalidateQueries`), assert the editor sheet and its primary title are still present.
  - "re-checks collision against the live board": open the editor on slot A; cause destination slot B to become occupied (mutate via the board), then Move A→B and assert the collision dialog ("That slot already has a meal") appears.
  Use a dedicated `QueryClient` with `gcTime: Infinity` for cache-state assertions.
- [ ] **Step 2:** `npm test -- --run src/components/meals-view.test.tsx` → confirm new tests FAIL.
- [ ] **Step 3:** Implement the contract above.
- [ ] **Step 4:** `npm test -- --run src/components/meals-view.test.tsx src/components/meals` → all green, including the existing `opens the live recipe detail from a recipe-backed planned meal` test (`meals-view.test.tsx:442`) which encodes the editor-first flow and MUST still pass.
- [ ] **Step 5: Commit** — `fix(meals): drive the meal editor from live board data so saves and collisions are accurate`

### Task 1b — C11: audit the `useUpsertMealSlot` cache write

**Files:** `src/api/hooks/use-meals.ts`, `src/api/hooks/use-meals.test.tsx`

**Problem:** `onSuccess` does `setQueryData(replaceSlotInBoard(...))` then `invalidateBoard(...)` on the same key (`use-meals.ts:77-81`). This is not automatically dead: it can give immediate UI feedback while TanStack Query refetches. The risk is that it is a partial hand-merge of one returned slot, so it cannot represent server-side effects outside that slot and may hide bugs in tests if the UI depends on the manual write instead of the server board.

**Contract:** Decide from tests, not preference:
- Keep the cache write if it is needed for immediate UX and does not conflict with the live-editor behavior from Task 1.
- Remove it only if invalidation/refetch alone leaves the visible board and editor correct without a stale gap.
- If it stays, tests must make clear that the server refetch remains the authority; do not add assertions that only pass because `replaceSlotInBoard` hand-merged one slot.
- If it is removed, delete `replaceSlotInBoard` and unused imports after grepping for references.

- [ ] **Step 1:** Add/adjust `use-meals.test.tsx` coverage for an upsert into an occupied slot with `collisionMode: "add_as_extra"`: assert the query is invalidated and, after the MSW refetch resolves, the board cache matches the server board (primary plus appended extra). Use a `QueryClient` with `gcTime: Infinity`.
- [ ] **Step 2:** Run the test against current code. If it already passes, this is cleanup-only; do not force a production code change just to make a test fail.
- [ ] **Step 3:** Choose the minimal implementation:
  - If invalidation/refetch alone keeps the UI correct after Task 1, remove `setQueryData` and delete `replaceSlotInBoard`.
  - If immediate cache update is still useful, keep the write and update comments/tests so it is documented as a temporary display hint, not the source of truth.
- [ ] **Step 4:** `npm test -- --run src/api/hooks/use-meals.test.tsx src/components/meals` green.
- [ ] **Step 5: Commit** — use the commit message matching the outcome:
  - `refactor(meals): rely on board refetch after meal upserts`
  - or `test(meals): document upsert cache invalidation behavior`

### Task 2 — C2: make past occupied meals openable for read-only review

**Files:** `src/components/meals/meal-slot-card.tsx`, `src/components/meals-view.test.tsx` (or `meal-slot-card` test if present)

**Problem:** Occupied slot cards are `disabled={readOnly}` (`meal-slot-card.tsx:32`), so on past weeks you cannot open the editor to review the full note/extras/recipe. Spec: past weeks remain browsable for review.

**Contract:**
- An **occupied** slot is always clickable (even when `readOnly`) and opens the editor in read-only mode. The empty-slot "Add meal" affordance stays hidden/disabled on read-only weeks (current behavior at `:88-94` is correct — keep it).
- The editor already gates all mutations behind `actionDisabled` (includes `readOnly`) and `!readOnly`; verify "View recipe" remains available for review. No mutation control may be enabled on a read-only week.
- Keep the hover affordance off for read-only (cursor-default) but allow the click.

- [ ] **Step 1: Failing test**: render the board for a **past** week with an occupied slot; assert the occupied card is not `disabled` and clicking it opens the editor; assert the editor shows the meal and that Replace/Add-extra/Move/Duplicate/Remove and the extra-remove ✕ are disabled/absent, while "View recipe" (for recipe-backed) works.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Remove `disabled={readOnly}` from the occupied-slot button; keep `cursor-default` styling for read-only. Ensure `MealsView.selectSlot` routes occupied → editor regardless of `readOnly` (it currently does, gated only on `!pendingRecipeId`; placement can't occur on a past week, so this is safe — verify).
- [ ] **Step 4:** `npm test -- --run src/components/meals-view.test.tsx src/components/meals` green.
- [ ] **Step 5: Commit** — `fix(meals): allow opening past occupied slots for read-only review`

---

## Phase 2 — Cross-module flow correctness

### Task 3 — C3: hide no-op actions in the meal-context recipe detail (editor-first flow kept)

**Files:**
- Modify: `src/components/recipes/recipe-detail-view.tsx`
- Modify: `src/components/meals/meal-editor-sheet.tsx`
- Create if absent: `src/components/recipes/recipe-detail-view.test.tsx`
- Modify integration coverage: `src/components/meals-view.test.tsx`

**Problem:** `RecipeDetailView` always renders Edit / Add to Meals / Favorite (`recipe-detail-view.tsx:126-150`); the meal editor passes `() => undefined` for all three (`meal-editor-sheet.tsx:212-214`), producing dead buttons. Decision: editor-first flow stays, so within a planned meal the recipe view is **review-only** (Back + View source + content). Recipe editing/favoriting/add-to-meals belong to the Recipes module, not the meal block editor.

**Contract:**
- Make `RecipeDetailView`'s action handlers **optional**: render the Edit button only when `onEdit` is provided, Add-to-Meals only when `onAddToMeals` is provided, Favorite only when `onToggleFavorite` is provided. `onBack` stays required. Existing `recipes-view.tsx` usage passes all three → unchanged behavior there.
- In `meal-editor-sheet.tsx`, stop passing the three no-op handlers; pass only `recipe` + `onBack`. No dead buttons appear in the meal-context detail.

- [ ] **Step 1: Failing tests**:
  - In `recipe-detail-view.test.tsx`: when rendered without `onEdit`/`onAddToMeals`/`onToggleFavorite`, those buttons are absent; with them, present (keeps library behavior).
  - In `meals-view.test.tsx`: from a recipe-backed meal, "View recipe" shows the detail with NO "Edit recipe" / "Add to Meals" / "Favorite" buttons, but Back and recipe content present. (The existing `meals-view.test.tsx:442` editor-first test must still pass.)
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Make handlers optional + conditional render; update meal editor usage.
- [ ] **Step 4:** `npm test -- --run src/components/recipes/recipe-detail-view.test.tsx src/components/meals-view.test.tsx src/components/recipes-view.test.tsx` green.
- [ ] **Step 5: Commit** — `fix(meals): make in-editor recipe view review-only instead of showing dead actions`

### Task 4 — C4: preserve slot/week context for the composer's full-library entry

**Files:** `src/components/meals/meal-composer-sheet.tsx`, `src/components/meals/meal-composer-sheet.test.tsx`

**Problem:** "Browse recipe library" calls `setActiveModule("recipes")` and closes the composer (`meal-composer-sheet.tsx:287-297`), dropping the slot/week being planned. Spec wants the quick-pick to be a real entry into the full library **for this slot**.

**Contract (chosen approach — in-composer full list, no context loss):**
- Replace the module-switching button with an in-composer "Show all recipes" affordance that lists the **entire** library (sorted favorites-first then `updatedAt` desc), selecting any of which places it into the current slot via the existing `handleSelectRecipe` path (respecting `intent`/collision). This keeps the slot/week entirely in context.
- The text/search field continues to filter the full library; "Show all recipes" simply removes the top-N cap so the whole library is reachable without leaving the composer.
- Remove the `setActiveModule` dependency from this control. (Leave the module switcher elsewhere untouched.)

- [ ] **Step 1: Failing test** (and UPDATE the existing `offers entry into the full recipe library` test at `meal-composer-sheet.test.tsx:182-191`, which currently asserts `activeModule === "recipes"` — that behavior is being removed): seed >6 recipes, open composer on an empty slot, activate "Show all recipes", assert every seeded recipe is listed and selecting one beyond the first 6 triggers the upsert for the SAME slot (week/day/mealType), and the composer did not switch modules.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement the in-composer full-library list.
- [ ] **Step 4:** `npm test -- --run src/components/meals/meal-composer-sheet.test.tsx src/components/meals-view.test.tsx` green.
- [ ] **Step 5: Commit** — `fix(meals): keep the slot in context when browsing the full recipe library`

### Task 5 — C5: make URL import reachable from the meals-origin recipe-creation flow

**Files:** `src/components/recipes-view.tsx`, `src/components/recipes/recipe-create-sheet.tsx`, `recipes-view`/`recipe-create-sheet` tests.

**Problem:** `recipes-view.tsx:140` sets the create-sheet mode to `"manual"` whenever a `recipeCreationDraft` (from Meals "Create recipe from this") exists, so the chooser — and thus "Import from URL" — is unreachable from that handoff. Spec/handoff plan intends import to be available.

**Contract:**
- When launched from a meals draft, the create sheet opens on the **chooser** ("Create manually" / "Import from URL"), not forced manual.
- The typed title carries into the manual branch as a default value (so "Create manually" still prefills the title). `RecipeCreateSheet` already accepts `defaultValues` + `defaultMode`; pass `defaultMode="choices"` and keep `defaultValues={{ title }}`.
- A successful create **or import** started from Meals returns the user to Meals planning with the new recipe available for placement (spec "Return behavior"). Verify the existing meals-return handling in `recipes-view.tsx` (the `onCreated` path for the draft) fires for the import path too; wire it if it currently only covers manual create.
- This intentionally adds one tap to the existing manual-prefill path. If product wants to preserve manual-first speed instead, implement an "Import from URL" action inside the draft manual sheet and keep the same import-return tests. Do not silently keep manual-only behavior.

- [ ] **Step 1: Failing tests**:
  - From a seeded `recipeCreationDraft`, opening the add flow shows BOTH "Create manually" and "Import from URL".
  - Picking "Create manually" shows the form with the title prefilled.
  - Completing an import from this flow returns to Meals with the recipe available for placement (assert the placement/return behavior used for manual create).
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Change the mode derivation to `"choices"` for drafts; ensure the return-to-Meals behavior covers import. (This also resolves Claude's T6 "no back path from import" since the chooser is now the entry.)
- [ ] **Step 4:** `npm test -- --run src/components/recipes-view.test.tsx src/components/recipes` green.
- [ ] **Step 5: Commit** — `fix(recipes): expose URL import in the meals-origin recipe creation flow`

---

## Phase 3 — Validation & data quality

### Task 6 — C6: route composer payloads through the Zod meal schemas; keep typed notes as slot notes

**Files:** `src/components/meals/meal-composer-sheet.tsx`, `src/components/meals/meal-composer-sheet.test.tsx`. Reference (do not duplicate): `src/lib/validations/meals.ts` (exports `upsertMealSlotSchema`, `mealEntrySchema`, `toMealEntryRequest`, etc.).

**Problem:** The composer hand-builds `UpsertMealSlotRequest` (`meal-composer-sheet.tsx:135-183`) and never uses the tested schemas, so an invalid image URL or over-long title is sent raw; meanwhile the schemas are not used by the composer submit path. Separately, the typed note is dropped on recipe placement (`buildRecipeRequest` hardcodes request `note: null`, `:151`), even though the Note input is visible.

**Contract:**
- Validate the quick-meal and recipe-placement requests with the existing schema(s) before mutating. On validation failure, surface a clear inline error (reuse the existing error region pattern) and do NOT mutate. The schema must reject a non-http(s) / malformed image URL and an over-long title (whatever `mealEntrySchema`/`optionalUrlSchema` already enforce — do not invent new rules; use what's tested).
- Build quick-meal entries via the schema's transform (`toMealEntryRequest`) rather than hand-mapping, so the composer and the tested contract can't drift again.
- Carry the composer's typed note into recipe-backed placement as the **slot-level** `UpsertMealSlotRequest.note`. Keep the recipe entry request note `null`; recipe-backed entry snapshots should continue to come from the saved recipe, while the user's meal-planning note belongs to the meal slot.

- [ ] **Step 1: Failing tests**:
  - Entering an invalid image URL (e.g. `not a url`) for a quick meal shows a validation error and performs no mutation (MSW handler not hit).
  - A valid quick meal still saves.
  - Selecting/placing a recipe with a typed note results in an upsert request whose top-level slot `note` carries that value and whose `primary.note` remains `null` (assert via captured request payload and/or resulting board).
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Wire validation + `toMealEntryRequest`; carry the note into `buildRecipeRequest`.
- [ ] **Step 4:** `npm test -- --run src/components/meals/meal-composer-sheet.test.tsx src/lib/validations/meals.test.ts src/components/meals-view.test.tsx` green.
- [ ] **Step 5: Commit** — `fix(meals): validate composer payloads with meal schemas and keep typed notes`

### Task 7 — C7: broken-image fallback for recipe surfaces

**Files:**
- Modify: `src/components/recipes/recipe-library-card.tsx`
- Modify: `src/components/recipes/recipe-detail-view.tsx`
- Modify: `src/components/meals/recipe-match-list.tsx`
- Create if absent: `src/components/recipes/recipe-library-card.test.tsx`
- Modify existing or create if absent: `src/components/recipes/recipe-detail-view.test.tsx`
- Create if absent: `src/components/meals/recipe-match-list.test.tsx`

**Problem:** These three `<img>` have no `onError`; a dead URL shows the broken-image glyph. `meal-slot-card.tsx:20,36-41` already has the correct `useState(imgFailed)` + `onError` → placeholder pattern.

**Contract:** Apply the same pattern: on image load error, fall back to the component's existing "No photo"/label placeholder. Keep the placeholder used when `imageUrl` is absent.

- [ ] **Step 1: Failing tests**: render each with an `imageUrl`, fire the `<img>` `error` event, assert the placeholder renders. (jsdom won't auto-fire load/error — dispatch the `error` event manually on the image node.)
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Add `imgFailed` state + `onError` + fallback in each.
- [ ] **Step 4:** `npm test -- --run src/components/recipes/recipe-library-card.test.tsx src/components/recipes/recipe-detail-view.test.tsx src/components/meals/recipe-match-list.test.tsx` green.
- [ ] **Step 5: Commit** — `fix(recipes): show a placeholder when a recipe image fails to load`

---

## Phase 4 — Polish & cleanup

### Task 8 — C8: meals board error retry

**Files:** `src/components/meals-view.tsx`, `src/components/meals-view.test.tsx`

**Contract:** The board error block (`meals-view.tsx:141-152`) gains a "Retry" button that refetches the board, disabled while refetching — mirror the Recipes pattern at `recipes-view.tsx:252-262`.

- [ ] **Step 1:** Failing test: force the board query into error (MSW 500), assert a Retry button appears and clicking it refetches (then succeeds with a seeded board).
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Add the retry button using `board.refetch` / `board.isRefetching`.
- [ ] **Step 4:** `npm test -- --run src/components/meals-view.test.tsx` green.
- [ ] **Step 5: Commit** — `fix(meals): add a retry action to the board error state`

### Task 9 — C9: recipe form per-row remove controls

**Files:**
- Modify: `src/components/recipes/recipe-form.tsx`
- Create if absent: `src/components/recipes/recipe-form.test.tsx`
- Modify if broader integration coverage is useful: `src/components/recipes-view.test.tsx`

**Problem:** `ArrayFieldSection` (`recipe-form.tsx:42-89`) renders Add but no per-row Remove.

**Contract:** Each ingredient, instruction, and tag row gets a Remove control (icon button with an accessible name like `Remove ingredient 2`, `Remove instruction 1`, `Remove tag 3`). Removing updates the array via the existing react-hook-form wiring (add an `onRemove(index)` prop and call `form.setValue(..., { shouldDirty: true })`). Preserve the current visual floor from `ensureMinimumLines`: if a user removes all rows, the underlying array may be empty for submission, but the UI should continue to render two blank rows because name-only recipes are valid.

- [ ] **Step 1:** Failing tests:
  - Add 3 ingredient rows, fill them, remove the middle one, assert the remaining values are correct and the removed value is gone.
  - Repeat the same remove behavior for instructions and tags.
  - Remove all rows from one section and assert the form still shows two blank rows and can submit a name-only recipe without sending blank strings.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Add `onRemove` + a Remove button per row; wire to the parent's array state.
- [ ] **Step 4:** `npm test -- --run src/components/recipes/recipe-form.test.tsx src/components/recipes` green.
- [ ] **Step 5: Commit** — `feat(recipes): allow removing ordered recipe rows`

### Task 10 — C10: recipes empty-state add button

**Files:** `src/components/recipes-view.tsx`, `src/components/recipes-view.test.tsx`

**Contract:** The empty-library card (`recipes-view.tsx:276-284`) gains an "Add your first recipe" button that opens the same create sheet as the header Add button (`setIsCreateSheetOpen(true)`).

- [ ] **Step 1:** Failing test: render with zero recipes, assert an "Add your first recipe" button exists in the empty card and clicking it opens the add flow (chooser).
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Add the button.
- [ ] **Step 4:** `npm test -- --run src/components/recipes-view.test.tsx` green.
- [ ] **Step 5: Commit** — `feat(recipes): add a CTA button to the empty recipe library state`

### Task 11 — C12: refresh README module status and fix the broken link

**Files:** `README.md` (docs only — no test)

**Contract:** Update the Current Status section (`README.md:53-65`) to reflect reality: Meals/Recipes/Lists/Chores actual states (Recipes + Meals are implemented against `family-hub-api v1.5.0`, not "UI ready"), and fix or remove the link to the deleted `docs/ROADMAP.md` (point to `docs/product/roadmap.md` in the root workspace if appropriate, or drop the line). Do not touch the release-please version marker comment. Keep wording consistent with the rest of the README.

- [ ] **Step 1:** Edit the status table + link. (No test; verify the file renders sensibly.)
- [ ] **Step 2: Commit** — `docs: refresh README module status and fix the roadmap link`

---

## Final verification gate (before opening the PR)

- [ ] `npm run build` — clean (tsc + Vite).
- [ ] `npm run lint` — clean (Biome).
- [ ] `npm test -- --run` — full suite green.
- [ ] Manually confirm the editor-first flow still works: tapping a recipe-backed planned meal opens the editor; "View recipe" reaches live detail (and shows no dead Edit/Favorite/Add buttons there).
- [ ] Open a PR from `fix/meals-recipes-review-consolidated` with `Closes`/links to the relevant Issue(s); body maps each non-negotiable (C1–C12) to its commit + test. No AI attribution.

## Requirement → coverage checklist for the PR body

| ID | Addressed by task | Test(s) |
|----|-------------------|---------|
| C1 | T1 | meals-view: live-note / revalidation / collision |
| C11 | T1b | use-meals upsert invalidation |
| C2 | T2 | past occupied slot opens read-only |
| C3 | T3 | recipe-detail-view optional actions; editor review-only |
| C4 | T4 | composer full-library in context (updated existing test) |
| C5 | T5 | meals-origin chooser + import return |
| C6 | T6 | composer validation + slot-note carry |
| C7 | T7 | image onError fallback ×3 |
| C8 | T8 | board retry |
| C9 | T9 | recipe row remove |
| C10 | T10 | empty-state CTA |
| C12 | T11 | README (docs) |

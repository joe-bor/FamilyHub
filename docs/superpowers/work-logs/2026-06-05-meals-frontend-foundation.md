# Meals Frontend Foundation Work Log

**Issue:** FamilyHub #184
**Branch:** `codex/meals-frontend-foundation`
**Date:** 2026-06-05

## Sources Read

- `frontend/AGENTS.md`
- FamilyHub issue #184 full body
- Story: `docs/product/backlog/module-foundations/module-surface-foundations.md`
- Spec: `docs/superpowers/specs/2026-06-01-meals-and-recipes-foundation-design.md`
- Plan: `docs/superpowers/plans/2026-06-01-meals-weekly-planning.md`
- Merged Recipes PR #185
- `family-hub-api` v1.5.0 meals controller, DTOs, and lowercase enum contracts

## Handoff Confirmation

Recipes PR #185 is present on this branch through `origin/main` merge commit `b229be1`.

Confirmed local shared Recipes <-> Meals draft contract:

- `mealPlacementDraft`
- `recipeCreationDraft`
- `startMealPlacementFromRecipe`
- `consumeMealPlacementDraft`
- `startRecipeCreationFromMealSlot`
- `consumeRecipeCreationDraft`
- lowercase `MealType` values: `breakfast`, `lunch`, `dinner`

No contract drift found before Meals implementation.

## Execution Contract Restatement

- Work only in `frontend`.
- Consume released backend `family-hub-api` `v1.5.0` or newer for `/api/meals` contract verification.
- Replace placeholder/sample Meals production state with API-backed weekly board data.
- Remove the old placeholder `meals-store` production path.
- Keep Meals household-level, not per-person.
- Treat breakfast, lunch, and dinner as equal first-class slots.
- Keep current and future weeks editable; past weeks reviewable without normal edit affordances.
- Do not add cooked, skipped, done, or other meal status state.
- Empty slots must invite adding a meal.
- Composer must be text-first with saved recipe suggestions, recent/favorite recipes, quick meals, full recipe-library entry, and `Create recipe from this`.
- Quick meals require a title and may include image URL and note.
- Recipe-backed planned meals use backend board-display snapshots and can open live recipe detail when the recipe still exists.
- Move means move; duplicate is explicit.
- Collisions from recipe placement, move, or duplicate must prompt `Replace primary`, `Add as extra`, or `Cancel`.
- Shared wire values stay lowercase: `breakfast`, `lunch`, `dinner`, `recipe`, `quick`, `replace_primary`, `add_as_extra`.
- If implementation reveals a Recipes/Meals contract gap, stop and report the root-doc drift before continuing.

## TDD Slices

1. Task 3: Meals contract, hooks, validation, mocks, week utilities, placeholder-store removal.
2. Task 4: Mobile board, composer, quick meals, recipe suggestions, recipe placement draft consumption.
3. Task 5: Large-screen grid, slot editor, move/duplicate/remove, collisions, live recipe detail navigation, mobile E2E.

## PR #187 Spec-Drift Review Fixes (2026-06-05)

Plan: `docs/superpowers/plans/2026-06-05-meals-spec-drift-fixes.md`. Fixed the valid findings; rejected three with evidence.

Fixed:

- **B1 — Replace meal.** Editor `Replace meal` action reopens the composer for the occupied slot (existing collision prompt handles primary replacement).
- **B2 — Manage extras or sides.** `Add extra or side` opens the composer in extra-intent mode (forces `add_as_extra`, no prompt); each extra chip gets a remove (×) that re-saves the slot composition.
- **B3 / N2 — Tablet blank gap + redundant guard.** New `useMediaQuery` hook drives a single `lg` (1024px) switch: day-cards below, grid at/above. Removed the grid's `hidden lg:block` CSS guard. `useIsMobile` (768) is untouched and still shared app-wide.
- **M2 — Placement draft survives week navigation.** `onWeekChange` no longer clears `placementDraft`, so "Add to Meals → switch weeks → pick a slot" works.
- **M3 / L2 — Move/duplicate destination.** New `MealMovePicker` (day + meal-type selects, default next-day/same-type) replaces the silent next-day hardcode; supports cross-day and cross-meal-type within the visible week. Collision detection now reads the in-board destination directly.
- **L1 — Meal note.** Editor edits the slot-level `note`; the board card surfaces it.

Rejected with evidence:

- **M1 (invalid).** `meal_slot_entry.recipe_id` is `ON DELETE SET NULL` and `MealMapper.toEntryDto` returns `recipeId: null` once a recipe is deleted; the editor already gates `View recipe` on `recipeId`. Snapshot title/image persist. Behavior already correct.
- **M4 (invalid).** `MealSlotResponse.java` includes `weekStartDate` and `dayIndex`; `MealMapper.toSlotDto` populates them. The fields are echoed exactly as the optimistic cache and request builders expect.
- **N1 (invalid).** `formatMealType` was already extracted to `meal-type-utils.ts`; all four files import it.

Known v1 constraint: `upsertSlot` re-snapshots recipe-backed entries from the live recipe, so editor "save composition" actions (remove extra, edit note) refresh those snapshots if the source recipe changed since placement. Deleted-recipe entries are re-sent as `quick` to preserve their snapshot. Granular per-entry edit endpoints are out of scope.

Verification: `npm run lint`, `npm run build`, `npm test -- --run` → 818 tests across 65 files pass.

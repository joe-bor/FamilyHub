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

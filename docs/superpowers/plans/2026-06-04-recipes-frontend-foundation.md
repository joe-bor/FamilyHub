# Recipes Frontend Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the frontend Recipes foundation for FamilyHub issue #183: standalone Recipes module, released `/api/recipes` contract integration, mobile-first recipe library/detail/create/edit/import UX, and shared Recipes/Meals handoff state without building Meals.

**Architecture:** Keep server state in `src/api`, reusable data shapes in `src/lib/types`, validation in `src/lib/validations`, UI state in Zustand `app-store`, and Recipes UI in `src/components/recipes/`. The UI remains mobile-first and cook-first, while shared Meals handoff state is intentionally thin and owned by the app shell until the follow-on Meals frontend issue consumes it.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS v4, shadcn/Radix-style local UI primitives, TanStack Query, React Hook Form, Zod, MSW, Vitest, Playwright.

---

## Released Backend Contract

Read from `family-hub-api v1.5.0`.

- `GET /api/recipes` -> `ApiResponse<RecipeSummaryResponse[]>`
- `GET /api/recipes/{id}` -> `ApiResponse<RecipeDetailResponse>`
- `POST /api/recipes` -> `ApiResponse<RecipeDetailResponse>`
- `PATCH /api/recipes/{id}` -> `ApiResponse<RecipeDetailResponse>`
- `POST /api/recipes/import` with `{ url: string }` -> `ApiResponse<RecipeDetailResponse>`

Frontend response fields:

```ts
export interface RecipeSummary {
  id: string;
  title: string;
  imageUrl: string | null;
  favorite: boolean;
  tags: string[];
  updatedAt: string;
}

export interface RecipeDetail extends RecipeSummary {
  ingredients: string[];
  instructions: string[];
  note: string | null;
  sourceUrl: string | null;
}
```

Frontend request fields:

```ts
export interface CreateRecipeRequest {
  title: string;
  imageUrl?: string | null;
  ingredients?: string[];
  instructions?: string[];
  note?: string | null;
  sourceUrl?: string | null;
  tags?: string[];
  favorite?: boolean;
}

export interface UpdateRecipeRequest {
  title?: string;
  imageUrl?: string | null;
  ingredients?: string[];
  instructions?: string[];
  note?: string | null;
  sourceUrl?: string | null;
  tags?: string[];
  favorite?: boolean;
}
```

## Task 1: Frontend Recipe Contract Layer

**Files:**
- Create: `src/lib/types/recipes.ts`
- Modify: `src/lib/types/index.ts`
- Create: `src/api/services/recipes.service.ts`
- Modify: `src/api/services/index.ts`
- Create: `src/api/hooks/use-recipes.ts`
- Modify: `src/api/hooks/index.ts`
- Modify: `src/api/index.ts`
- Create: `src/lib/validations/recipes.ts`
- Modify: `src/lib/validations/index.ts`
- Create: `src/lib/validations/recipes.test.ts`
- Create: `src/test/fixtures/recipes.ts`
- Modify: `src/test/mocks/handlers.ts`
- Modify: `src/test/mocks/server.ts`
- Create: `src/api/hooks/use-recipes.test.tsx`

- [ ] **Step 1: Write failing contract and validation tests**

Add tests covering:

- `useRecipes` loads summary data from MSW.
- `useRecipe` loads detail data.
- `useCreateRecipe` seeds detail cache and invalidates the library query.
- `useUpdateRecipe` updates detail cache and invalidates the library query.
- `useImportRecipe` posts `{ url }`, auto-saves by receiving created detail, seeds detail cache, invalidates the library query, and surfaces import errors.
- `recipeFormSchema` requires a nonblank title.
- Optional image URL, note, source URL, ingredients, instructions, tags, and favorite normalize to API-ready values.
- Ordered ingredients, instructions, and tags are preserved.

Run:

```bash
env PATH=/Users/joe.bor/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH npm test -- --run src/api/hooks/use-recipes.test.tsx src/lib/validations/recipes.test.ts
```

Expected: FAIL because recipe hooks, service, fixtures, and schema do not exist.

- [ ] **Step 2: Implement the contract layer**

Use `httpClient` paths without `/api` prefix, matching existing services:

```ts
export const recipesService = {
  getRecipes: () => httpClient.get<RecipesApiResponse>("/recipes"),
  getRecipe: (id: string) =>
    httpClient.get<RecipeDetailApiResponse>(`/recipes/${id}`),
  createRecipe: (request: CreateRecipeRequest) =>
    httpClient.post<RecipeDetailApiResponse>("/recipes", request),
  updateRecipe: (id: string, request: UpdateRecipeRequest) =>
    httpClient.patch<RecipeDetailApiResponse>(`/recipes/${id}`, request),
  importRecipe: (url: string) =>
    httpClient.post<RecipeDetailApiResponse>("/recipes/import", { url }),
};
```

Add `recipesKeys` with `list()` and `detail(id)`. On create/update/import success, set detail cache and invalidate list. On update, keep the implementation conservative rather than optimistic.

Validation rules:

- `title`: trimmed, 1-160 chars.
- `imageUrl` and `sourceUrl`: optional empty string -> `null`, otherwise valid URL.
- `ingredients`: trim, remove blank rows, preserve order, max 500 chars each.
- `instructions`: trim, remove blank rows, preserve order.
- `tags`: trim, remove blank rows, preserve order, max 60 chars each.
- `note`: optional empty string -> `null`.
- `favorite`: default `false`.

MSW handlers must keep in-memory recipe data, reset between tests, support list/detail/create/patch/import, and return a 400-style import failure for a known bad URL.

- [ ] **Step 3: Verify and commit**

Run:

```bash
env PATH=/Users/joe.bor/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH npm test -- --run src/api/hooks/use-recipes.test.tsx src/lib/validations/recipes.test.ts
```

Expected: PASS for recipe query/mutation/cache behavior, validation, ordered fields, and error handling.

Commit:

```bash
git add src/lib/types/recipes.ts src/lib/types/index.ts src/api/services/recipes.service.ts src/api/services/index.ts src/api/hooks/use-recipes.ts src/api/hooks/index.ts src/api/index.ts src/lib/validations/recipes.ts src/lib/validations/index.ts src/lib/validations/recipes.test.ts src/test/fixtures/recipes.ts src/test/mocks/handlers.ts src/test/mocks/server.ts src/api/hooks/use-recipes.test.tsx
git commit -m "feat(recipes): add frontend recipe contracts"
```

## Task 2: Shell Registration And Navigation

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/stores/app-store.ts`
- Modify: `src/components/shared/mobile-bottom-nav.tsx`
- Modify: `src/components/shared/navigation-tabs.tsx`
- Modify: `src/components/shared/mobile-bottom-nav.test.tsx`
- Modify: `src/components/shared/navigation-tabs.test.tsx`
- Create: `src/components/recipes-view.tsx` with temporary minimal shell content only if needed for route rendering

- [ ] **Step 1: Write failing shell/navigation tests**

Add tests covering:

- `ModuleType` accepts `recipes`.
- Desktop navigation includes `Recipes` and keeps `Meals`.
- Mobile bottom nav includes `Recipes` and keeps `Meals`.
- Mobile bottom nav remains readable/tappable with seven destinations; use a horizontally scrollable or otherwise stable layout instead of squeezing text into an unreadable seven-column grid.
- `App` renders the Recipes module when `activeModule` is `recipes`.

Run:

```bash
env PATH=/Users/joe.bor/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH npm test -- --run src/components/shared/mobile-bottom-nav.test.tsx src/components/shared/navigation-tabs.test.tsx src/App.shell.test.tsx
```

Expected: FAIL because `recipes` is not registered.

- [ ] **Step 2: Implement shell registration**

Add `recipes` to `ModuleType`, lazy-load `RecipesView`, register the `recipes` render branch, and add a `BookOpenText` icon destination in desktop and mobile navigation.

For mobile bottom nav, keep stable touch targets and readable labels. Prefer:

```tsx
<div className="flex gap-1 overflow-x-auto px-2 pt-2">
  <button className="flex min-h-14 min-w-[64px] flex-1 flex-col ..." />
</div>
```

Do not remove `Meals`.

- [ ] **Step 3: Verify and commit**

Run:

```bash
env PATH=/Users/joe.bor/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH npm test -- --run src/components/shared/mobile-bottom-nav.test.tsx src/components/shared/navigation-tabs.test.tsx src/App.shell.test.tsx
```

Expected: PASS for shell registration and navigation readability coverage.

Commit:

```bash
git add src/App.tsx src/stores/app-store.ts src/components/shared/mobile-bottom-nav.tsx src/components/shared/navigation-tabs.tsx src/components/shared/mobile-bottom-nav.test.tsx src/components/shared/navigation-tabs.test.tsx src/App.shell.test.tsx src/components/recipes-view.tsx
git commit -m "feat(recipes): register recipes module"
```

## Task 3: Recipe Library And Lightweight Discovery

**Files:**
- Replace/minimally expand: `src/components/recipes-view.tsx`
- Create: `src/components/recipes/recipe-library-card.tsx`
- Create: `src/components/recipes/recipe-filter-bar.tsx`
- Create: `src/components/recipes-view.test.tsx`

- [ ] **Step 1: Write failing library tests**

Add tests covering:

- Loading state.
- Error state with retry.
- Empty state invites adding the first recipe.
- Summary cards render image/title/tags/favorite state.
- Search matches recipe title and tags.
- Favorites filter shows favorites and keeps favorites first in search/picker-style results.
- Tag filter stays lightweight and mobile-friendly.
- Library cards are visible browse results without unfinished detail navigation until Task 5.
- No nonfunctional `Add recipe` control is rendered until the real add flow lands in Task 4.

Run:

```bash
env PATH=/Users/joe.bor/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH npm test -- --run src/components/recipes-view.test.tsx
```

Expected: FAIL because library UI does not exist.

- [ ] **Step 2: Implement library UI**

Build a mobile-first library screen with:

- Header: `Recipes` with discovery copy.
- Search input.
- Favorites toggle.
- Tag filter chips derived from recipe summaries.
- Visual recipe cards using image when present and a calm fallback when absent.
- Empty/loading/error/filtered-empty states.
- `buildVisibleRecipes(recipes, filters)` helper exported for focused tests if useful.

Use `cn()` for class merging and existing UI primitives.

- [ ] **Step 3: Verify and commit**

Run:

```bash
env PATH=/Users/joe.bor/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH npm test -- --run src/components/recipes-view.test.tsx
```

Expected: PASS for library states, favorites, search, tags, normalized tag filtering, and no unfinished create/detail controls.

Commit:

```bash
git add src/components/recipes-view.tsx src/components/recipes/recipe-library-card.tsx src/components/recipes/recipe-filter-bar.tsx src/components/recipes-view.test.tsx
git commit -m "feat(recipes): add recipe library"
```

## Task 4: Manual Create And URL Import Add Flow

**Files:**
- Modify: `src/components/recipes-view.tsx`
- Create: `src/components/recipes/recipe-form.tsx`
- Create: `src/components/recipes/recipe-create-sheet.tsx`
- Create: `src/components/recipes/recipe-import-sheet.tsx`
- Modify: `src/components/recipes-view.test.tsx`

- [ ] **Step 1: Write failing add-flow tests**

Add tests covering:

- `Add recipe` opens a single add flow with choices `Create manually` and `Import from URL`.
- URL import is not visible as a peer action on the library home.
- Manual creation can submit title-only.
- Manual creation preserves ordered ingredients, instructions, and tags.
- Successful manual creation lands in recipe detail.
- Import posts the URL, successful import auto-saves, closes the add/import sheet, and lands in recipe detail.
- Import failure shows a clear error and does not create a partial local recipe.

Run:

```bash
env PATH=/Users/joe.bor/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH npm test -- --run src/components/recipes-view.test.tsx src/lib/validations/recipes.test.ts
```

Expected: FAIL because create/import UI does not exist.

- [ ] **Step 2: Implement add flow**

Build:

- `RecipeForm`: shared ordered fields with add/remove controls for ingredients, instructions, and tags.
- `RecipeCreateSheet`: add-flow sheet with mode selection and manual form.
- `RecipeImportSheet` or nested import mode inside create sheet: URL input, import mutation, error display.

Keep URL import inside add flow. On create/import success:

- Close sheet.
- Select created/imported recipe id.
- Let detail query/cache display the saved recipe.

- [ ] **Step 3: Verify and commit**

Run:

```bash
env PATH=/Users/joe.bor/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH npm test -- --run src/components/recipes-view.test.tsx src/lib/validations/recipes.test.ts
```

Expected: PASS for manual create, ordered fields, import auto-save, import error, and URL import placement.

Commit:

```bash
git add src/components/recipes-view.tsx src/components/recipes/recipe-form.tsx src/components/recipes/recipe-create-sheet.tsx src/components/recipes/recipe-import-sheet.tsx src/components/recipes-view.test.tsx src/lib/validations/recipes.test.ts
git commit -m "feat(recipes): add recipe create and import flows"
```

## Task 5: Cook-First Detail, Edit, And Favorite

**Files:**
- Create: `src/components/recipes/recipe-detail-view.tsx`
- Create: `src/components/recipes/recipe-edit-sheet.tsx`
- Modify: `src/components/recipes-view.tsx`
- Modify: `src/components/recipes-view.test.tsx`

- [ ] **Step 1: Write failing detail/edit/favorite tests**

Add tests covering:

- Detail renders image, title, ingredients, and instructions before action controls in DOM order.
- Detail handles missing optional image/ingredients/instructions gracefully.
- Favorite toggle patches saved recipe state and updates visible detail state.
- Edit opens saved recipe form with existing values.
- Save changes patches fields and keeps ordered ingredients/instructions/tags.
- Back returns to library.

Run:

```bash
env PATH=/Users/joe.bor/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH npm test -- --run src/components/recipes-view.test.tsx
```

Expected: FAIL because full detail/edit/favorite UI does not exist.

- [ ] **Step 2: Implement cook-first detail**

Build detail in this order:

1. Image or visual fallback.
2. Title and tags/source metadata.
3. Ingredients.
4. Instructions.
5. Note.
6. Secondary actions area with `Favorite`, `Edit`, and `Add to Meals` placeholder that Task 6 wires.

Use `useUpdateRecipe` for favorite toggle and edit save. Convert a loaded `RecipeDetail` to an update request without losing ordered arrays.

- [ ] **Step 3: Verify and commit**

Run:

```bash
env PATH=/Users/joe.bor/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH npm test -- --run src/components/recipes-view.test.tsx
```

Expected: PASS for cook-first detail, favorite, edit, and back navigation.

Commit:

```bash
git add src/components/recipes/recipe-detail-view.tsx src/components/recipes/recipe-edit-sheet.tsx src/components/recipes-view.tsx src/components/recipes-view.test.tsx
git commit -m "feat(recipes): add cook-first recipe detail"
```

## Task 6: Shared Recipes/Meals Handoff And Sunday Week Start

**Files:**
- Modify: `src/stores/app-store.ts`
- Modify: `src/stores/index.ts`
- Modify: `src/test/setup.ts`
- Modify: `src/lib/time-utils.ts`
- Modify: `src/lib/time-utils.test.ts`
- Modify: `src/components/recipes-view.tsx`
- Modify: `src/components/recipes/recipe-detail-view.tsx`
- Modify: `src/components/recipes-view.test.tsx`

- [ ] **Step 1: Write failing handoff and time tests**

Add tests covering:

- `getWeekStartSunday(new Date(2026, 5, 10))` formats to `2026-06-07`.
- `getWeekStartSunday` returns the same local date when given a Sunday.
- `Add to Meals` on recipe detail sets `mealPlacementDraft`, switches active module to `meals`, and uses source `{ kind: "recipes-library" }`.
- A `recipeCreationDraft` with lowercase `mealType: "breakfast" | "lunch" | "dinner"` opens the Recipes add flow prefilled from `typedTitle`.
- Creating a recipe from that draft switches back to `meals` and creates a `mealPlacementDraft` with source `{ kind: "meals-slot", dayIndex, mealType }`.
- Test setup resets new draft store fields.

Run:

```bash
env PATH=/Users/joe.bor/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH npm test -- --run src/components/recipes-view.test.tsx src/lib/time-utils.test.ts src/stores/app-store.test.ts
```

Expected: FAIL because handoff state and Sunday helper do not exist.

- [ ] **Step 2: Implement handoff state and helper**

Add:

```ts
export type MealType = "breakfast" | "lunch" | "dinner";

export interface MealPlacementDraft {
  recipeId: string;
  requestedAtWeekStartDate: string;
  source:
    | { kind: "recipes-library" }
    | { kind: "meals-slot"; dayIndex: number; mealType: MealType };
}

export interface RecipeCreationDraft {
  requestedAtWeekStartDate: string;
  dayIndex: number;
  mealType: MealType;
  typedTitle: string;
}
```

Store actions:

- `startMealPlacementFromRecipe(draft)` sets draft and `activeModule: "meals"`.
- `consumeMealPlacementDraft()` returns and clears the draft.
- `startRecipeCreationFromMealSlot(draft)` sets draft and `activeModule: "recipes"`.
- `consumeRecipeCreationDraft()` returns and clears the draft.

Time helper:

```ts
export function getWeekStartSunday(date: Date): Date {
  const start = startOfDay(date);
  start.setDate(start.getDate() - start.getDay());
  return start;
}
```

Wire `Add to Meals` in detail using `formatLocalDate(getWeekStartSunday(new Date()))`.

When Recipes view sees `recipeCreationDraft`, open manual create prefilled with `typedTitle`. On successful create/import started from Meals, consume the draft and start a `meals-slot` placement draft. Do not build any slot picker, board, collision UI, or persistence.

- [ ] **Step 3: Verify and commit**

Run:

```bash
env PATH=/Users/joe.bor/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH npm test -- --run src/components/recipes-view.test.tsx src/lib/time-utils.test.ts src/stores/app-store.test.ts
```

Expected: PASS for Sunday helper and both handoff directions, with lowercase meal types.

Commit:

```bash
git add src/stores/app-store.ts src/stores/index.ts src/test/setup.ts src/lib/time-utils.ts src/lib/time-utils.test.ts src/components/recipes-view.tsx src/components/recipes/recipe-detail-view.tsx src/components/recipes-view.test.tsx
git commit -m "feat(recipes): add meals handoff draft"
```

## Task 7: Mobile Recipe E2E And Final Verification

**Files:**
- Create: `e2e/mobile-recipes.spec.ts`
- Read/modify as needed: `e2e/helpers/*`
- Modify only if needed: recipe UI selectors from earlier tasks

- [ ] **Step 1: Write mobile recipe E2E**

Cover:

- Navigate to Recipes from mobile bottom nav.
- Empty or seeded library renders.
- Add recipe opens create flow.
- Manual title-only create lands in detail.
- URL import is reachable inside add flow and successful import lands in detail.
- Favorite toggle works on detail.

Run:

```bash
env PATH=/Users/joe.bor/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH npm run test:e2e -- e2e/mobile-recipes.spec.ts
```

Expected:

- PASS if local backend test environment is available and points to `family-hub-api v1.5.0` or newer.
- If the environment is unavailable, record the blocker and keep MSW/unit coverage as the completed frontend verification.

- [ ] **Step 2: Run focused issue verification**

Run:

```bash
env PATH=/Users/joe.bor/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH npm test -- --run src/api/hooks/use-recipes.test.tsx src/lib/validations/recipes.test.ts src/components/recipes-view.test.tsx src/lib/time-utils.test.ts src/components/shared/mobile-bottom-nav.test.tsx src/components/shared/navigation-tabs.test.tsx
```

Expected: PASS.

- [ ] **Step 3: Run broader frontend verification required by `AGENTS.md`**

Run:

```bash
env PATH=/Users/joe.bor/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH npm run lint
env PATH=/Users/joe.bor/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH npm test -- --run
env PATH=/Users/joe.bor/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH npm run build
```

Expected: PASS for lint, Vitest, and production build.

- [ ] **Step 4: Final review and commit**

Use `superpowers:verification-before-completion` before any completion claim.

Use `superpowers:requesting-code-review` for final review. Fix Critical and Important findings in scope.

Commit:

```bash
git add e2e/mobile-recipes.spec.ts
git commit -m "test(recipes): add mobile recipe coverage"
```

If review fixes are needed, commit them separately:

```bash
git add <review-fix-files>
git commit -m "fix(recipes): address recipes review findings"
```

## Task 8: PR Handoff

**Files:**
- No code changes unless the final checklist reveals a gap.

- [ ] **Step 1: Build final issue-contract checklist**

Map every issue execution-contract bullet to code and tests in the final response and PR body.

- [ ] **Step 2: Push and open PR**

Use `superpowers:finishing-a-development-branch`.

Run:

```bash
git status --short
git push -u origin codex/recipes-frontend
gh pr create --repo joe-bor/FamilyHub --base main --head codex/recipes-frontend --title "feat: add recipes frontend foundation" --body-file <prepared-pr-body>
```

Expected: PR opens against `joe-bor/FamilyHub` with `Closes #183`.

## Scope Guardrails

- Do not implement Meals board UI.
- Do not implement Meals composer.
- Do not implement meal persistence or meal snapshot behavior.
- Do not implement collision UX.
- Do not implement grocery/list generation or pantry features.
- Do not edit backend or root production code.
- Stop and report if a Recipes/Meals contract gap appears.

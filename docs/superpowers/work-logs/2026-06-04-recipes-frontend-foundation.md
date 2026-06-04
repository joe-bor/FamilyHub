# Recipes Frontend Foundation Work Log

## Source Artifacts Read Before Coding

- `frontend/AGENTS.md`
- FamilyHub issue #183, "Implement Recipes frontend foundation"
- Story: `docs/product/backlog/module-foundations/module-surface-foundations.md`
- Spec: `docs/superpowers/specs/2026-06-01-meals-and-recipes-foundation-design.md`
- Root plan: `docs/superpowers/plans/2026-06-01-recipes-module-foundation.md`
- Released backend contract: `family-hub-api` `v1.5.0`, including release metadata and the tagged recipe controller/DTO files

## Baseline Verification

Run from isolated worktree `/Users/joe.bor/code/family-hub/frontend/.worktrees/codex/recipes-frontend` with bundled Node on 2026-06-04:

```bash
env PATH=/Users/joe.bor/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH npm test -- --run
```

Observed result: 58 test files passed, 722 tests passed.

## Non-Negotiable Execution Contract

- Work only in `frontend`.
- Use branch `codex/recipes-frontend`.
- Keep implementation scoped to Recipes frontend only.
- Add `Recipes` as a standalone top-level module; do not hide recipe behavior inside `Meals`.
- Keep `Meals` as a separate module destination and preserve mobile bottom-nav readability after adding `Recipes`.
- Consume the released backend contract `family-hub-api v1.5.0` or newer for real `/api/recipes` verification. Do not depend on unreleased backend `main`.
- Implement frontend `/api/recipes` types, services, hooks, validation, fixtures, and MSW handlers against the released backend fields and endpoints.
- Manual recipe creation requires only a nonblank title. Image URL, ingredients, instructions, note, source URL, tags, and favorite are optional.
- Preserve ordered ingredients, ordered instructions, and ordered tags in form state and API payloads.
- Keep URL import inside the add flow. It is not a peer library-home action.
- Successful URL imports auto-save and then land in recipe detail.
- Recipe detail is cook-first: image, title, ingredients, instructions first. `Favorite`, `Edit`, and `Add to Meals` must be reachable without overtaking cooking content.
- Favorites are editable saved-recipe state and must matter in search/pickers.
- Tags and filters stay lightweight and mobile-friendly.
- Add shared handoff state for both directions:
  - `Recipes -> Meals`: saved recipe creates a meal-placement draft and switches to `Meals`.
  - `Meals -> Recipes -> back to Meals`: recipe creation can start from a meal slot draft and return to planning context.
- Shared meal type values must stay lowercase: `breakfast`, `lunch`, `dinner`.
- Add the Sunday week-start helper in shared frontend utilities for later Meals consumption.
- Do not implement the Meals board, composer, collision UX, meal persistence, meal snapshot behavior, grocery/list generation, pantry management, backend code, or production code outside the frontend repo.
- If the issue, story, spec, root plan, or released backend contract disagree, stop and report the drift before coding.

## Contract Drift Check

No blocking drift found before implementation.

Notes:

- The issue narrows the root plan to frontend Tasks 3-5, plus Recipes-owned review from Task 6.
- Backend `v1.5.0` exposes `GET /api/recipes`, `GET /api/recipes/{id}`, `POST /api/recipes`, `PATCH /api/recipes/{id}`, and `POST /api/recipes/import`, wrapped in `ApiResponse`.
- Backend `v1.5.0` recipe DTOs expose `title`, `imageUrl`, ordered `ingredients`, ordered `instructions`, `note`, `sourceUrl`, ordered `tags`, `favorite`, and `updatedAt`; `id` is returned on summary/detail responses.

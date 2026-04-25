# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Product source of truth (cross-repo)

The Family Hub product vision, roadmap, and backlog live in the root workspace repo `joe-bor/family-hub`, in `docs/product/`. Before starting a story or feature, read the linked story file.

- PRD: `../docs/product/prd.md` (if working in the cloned workspace)
- Roadmap: `../docs/product/roadmap.md`
- Backlog: `../docs/product/backlog/`
- Agent entry: `../AGENTS.md`

Tasks come in as GitHub Issues with a `Story:` line pointing to the story file. Follow that link for context.

## Commands

```bash
npm run dev          # Start dev server at localhost:5173
npm run build        # Type-check with tsc then build with Vite
npm run lint         # Run Biome linter
npm run lint:fix     # Fix lint issues automatically
npm run format       # Format all files with Biome
npm run format:check # Check formatting without changes
npm run preview      # Preview production build
npm run test         # Run Vitest in watch mode
npm run test:ui      # Open Vitest UI
npm run test:coverage # Run tests with coverage report
npm run test:e2e     # Run Playwright E2E tests
npm run test:e2e:ui  # Open Playwright UI
npm run lighthouse   # Run Lighthouse CI (builds first)
```

## Architecture

FamilyHub is a family organization app built with React 19, Vite, and Tailwind CSS v4. It uses shadcn/ui patterns with Radix UI primitives.

**Key layers:**
- `src/api/` — TanStack Query hooks + services (server state)
- `src/stores/` — Zustand stores (UI state only; server data lives in `@/api`)
- `src/lib/types/` — Centralized TypeScript types
- `src/components/` — UI components organized by feature

Barrel exports: `@/api`, `@/stores`, `@/lib/types`, `@/components/calendar`, `@/components/shared`. Import alias `@/` maps to `src/`.

## Styling

Tailwind CSS v4 with PostCSS. Colors defined as CSS variables in `src/index.css` using oklch. Always use `cn()` from `@/lib/utils` for className merging.

## Date/Time Pitfalls

**Always use `src/lib/time-utils.ts`** — never raw `Date` string parsing or `toISOString()`.

```typescript
// ❌ WRONG: parses as UTC midnight → wrong date in PST
new Date("2025-12-23")

// ❌ WRONG: shifts to UTC, wrong date for users west of UTC
date.toISOString()

// ✅ Correct utilities
import { parseLocalDate, formatLocalDate, format24hTo12h, format12hTo24h } from "@/lib/time-utils"
parseLocalDate("2025-12-23")   // → Dec 23 at local midnight
formatLocalDate(new Date())     // → "yyyy-MM-dd" in local timezone
```

## Testing Gotchas

**Test file locations:** `src/**/*.test.tsx` (unit/integration), `e2e/` (Playwright), `src/test/` (utilities, mocks, fixtures).

**CI race condition — async form fields:** Forms with TanStack Query-derived defaults (e.g., `memberId`) can fail in CI due to timing. Fix: pass explicit `defaultValues`, then wait before interacting:
```typescript
render(<EventForm mode="add" defaultValues={{ memberId: testMembers[0].id }} onSubmit={fn} />)
await waitForMemberSelected(testMembers[0].name) // wait for selected state, not just DOM
```
See `src/test/test-utils.tsx` for `waitForMemberSelected`, `typeAndWait`, `TEST_TIMEOUTS`.

**Optimistic update tests need `gcTime: Infinity`:** The default test `QueryClient` uses `gcTime: 0` — cache is GC'd before assertions. Create a dedicated client for any test asserting cache state after mutations.

**Store auto-reset:** All Zustand stores reset after each test via `src/test/setup.ts`. Use `seedCalendarStore`, `seedFamilyStore`, `seedAuthStore` from `@/test/test-utils` to set up state.

**E2E helpers** (`e2e/helpers/`): `safeClick`, `waitForDialogReady`, `waitForCalendarReady`, `waitForDialogClosed`, `waitForHydration`, `registerFamily`, `seedBrowserAuth`.

## CI/CD — Deploy Order

`deploy.sh` runs checks fastest-to-slowest:
1. Clean working tree
2. Must be on `main`, synced with `origin/main`
3. Must be the exact released FE commit tagged `family-hub-v<package.json version>`
4. `npm run lint`
5. `npm test -- --run`
6. Build → rsync to server → HTTP health check

## Shipping Semantics

- Backend `main` may merge incrementally. FE should treat only published BE releases as stable integration contracts.
- FE CI E2E resolves the latest published BE release from GitHub Releases and sets `BE_IMAGE_TAG` before starting the backend container.
- Manual FE deploys still happen from a local terminal via `deploy.sh`; CI does not have droplet access.
- FE production deploys must ship only a released FE commit on `main`. Do not deploy arbitrary `main` commits.

## Versioning

Automated via release-please on push to `main`. Use **regular merge commits** (not squash) so individual `feat:`/`fix:` commits are visible.

| Commit type | Bump |
|-------------|------|
| `feat:` | minor (0.2.0 → 0.3.0) |
| `fix:`, `perf:`, `docs:` | patch (0.2.0 → 0.2.1) |
| `chore:`, `build:`, `ci:` | none |

## z-index Hierarchy

- `z-10` — sticky date headers
- `z-20` — time indicators
- `z-40` — FAB (Add event), sidebar backdrop
- `z-50` — dialogs/modals

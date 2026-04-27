# Work Log

## 2026-04-27 — Issue #148: Persistent bottom navigation

Implementation contract summary (from issue #148 + linked Story/Spec/Plan):

- Add a mobile-only persistent bottom rail with exactly 6 tabs in order: Home, Calendar, Lists, Chores, Meals, Photos.
- Keep navigation state-based via `activeModule` (no routing); Home must map to `activeModule === null`.
- Keep desktop navigation behavior unchanged and continue using desktop `NavigationTabs`.
- Keep `AppHeader` visible on mobile Home and non-calendar modules; suppress it only on mobile Calendar.
- Remove redundant Home affordances: no Home button in `AppHeader`, no Home button in `MobileToolbar`.
- Implement bottom nav as part of the app shell layout (bottom rail sibling), not a fixed content overlay.
- Ensure shell/content wrappers keep `min-h-0`/overflow behavior so module scrolling is not obscured.
- Raise the mobile Calendar FAB so it clears the new bottom rail and safe area.
- Do not show bottom nav on desktop, login, or onboarding/setup surfaces.
- Add/update tests to lock these behaviors (mobile tab state, shell visibility rules, toolbar cleanup, FAB offset).

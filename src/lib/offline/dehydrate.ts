import type { DehydrateOptions, Query } from "@tanstack/react-query";

/**
 * Explicit allowlist of query families that may be persisted to IndexedDB for
 * offline reads. Matched structurally against the query-key factories so the
 * intent is auditable in one place:
 *
 *   - `familyKeys.family()`              → ["family", "data"]
 *   - `calendarKeys.eventList(params)`   → ["calendar", "events", params]
 *   - `calendarKeys.event(id)`           → ["calendar", "events", id]
 *   - `choreKeys.board()`                → ["chores", "board"]
 *   - `listsKeys.hub()`                  → ["lists", "hub"]
 *   - `listsKeys.detail(id)`             → ["lists", "detail", id]
 *   - `listsKeys.preferences()`          → ["lists", "preferences"]
 *   - `mealsKeys.board(weekStartDate)`   → ["meals", "board", weekStartDate]
 *   - `recipesKeys.list()`               → ["recipes", "list"]
 *   - `recipesKeys.detail(id)`           → ["recipes", "detail", id]
 *
 * Everything else is excluded by design — notably `authKeys` (session data),
 * `googleCalendarKeys` (connection settings/status), photos/binary data, and
 * any future query family that is not added here explicitly.
 */
export function isOfflineReadQueryKey(queryKey: readonly unknown[]): boolean {
  const [domain, sub] = queryKey;

  switch (domain) {
    case "family":
      return sub === "data";
    case "calendar":
      // Covers both eventList(params) and event(id); both share ["calendar","events"].
      return sub === "events";
    case "chores":
      return sub === "board";
    case "lists":
      return sub === "hub" || sub === "detail" || sub === "preferences";
    case "meals":
      return sub === "board";
    case "recipes":
      return sub === "list" || sub === "detail";
    default:
      return false;
  }
}

/**
 * Whether a query should be written to the persisted offline read cache.
 *
 * Persist only successful reads that actually have data AND are on the
 * allowlist. Pending and errored queries are never persisted so a cold start
 * can't rehydrate a spinner or a stale error.
 */
export function shouldDehydrateOfflineReadQuery(query: Query): boolean {
  return (
    query.state.status === "success" &&
    query.state.data !== undefined &&
    isOfflineReadQueryKey(query.queryKey)
  );
}

/**
 * Dehydration config for the persisted offline read cache.
 *
 * `shouldDehydrateMutation` is hard-disabled so paused/offline mutations are
 * never persisted — this is what keeps offline writes / outbox queues out of
 * scope (PRD §7.5.3 remains deferred).
 */
export const offlineReadDehydrateOptions: DehydrateOptions = {
  shouldDehydrateQuery: shouldDehydrateOfflineReadQuery,
  shouldDehydrateMutation: () => false,
};

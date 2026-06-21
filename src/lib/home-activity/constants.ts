export const ACTIVITY_WINDOW_MS = 1000 * 60 * 60 * 48; // 48h rolling window
export const MEANINGFUL_GAP_MS = 1000 * 60 * 60 * 4; // 4h hidden → next open is "meaningful"
export const STALE_RESEED_MS = ACTIVITY_WINDOW_MS; // away longer than the window → silent reseed
export const FEED_ENTRY_CAP = 20; // max top-level entries (calendar group counts as one) — bounds length
export const CALENDAR_SUBROW_CAP = 10; // max sub-rows inside the expanded calendar group
export const FEED_EVENT_WINDOW_DAYS = 28; // calendar detection window
export const LAST_SEEN_KEY = "family-hub-activity-last-seen";
export const HIDDEN_AT_KEY = "family-hub-activity-hidden-at";

// A DEDICATED database — NOT the offline cache's `family-hub-offline`.
// `idb-keyval.createStore` calls `indexedDB.open(dbName)` with no version, so it
// can only create its object store during the DB's initial `onupgradeneeded`. The
// offline cache already created `family-hub-offline` at v1 with `query-cache`, so
// adding a second store to that DB would never fire an upgrade and every
// transaction would throw (silently swallowed). A separate DB avoids that entirely.
export const ACTIVITY_DB_NAME = "family-hub-home-activity";
export const ACTIVITY_STORE_NAME = "home-activity";
export const ACTIVITY_STATE_KEY = "activity-state";

export const ACTIVITY_WINDOW_MS = 1000 * 60 * 60 * 48; // 48h rolling window
export const MEANINGFUL_GAP_MS = 1000 * 60 * 60 * 4; // 4h hidden → next open is "meaningful"
export const STALE_RESEED_MS = ACTIVITY_WINDOW_MS; // away longer than the window → silent reseed
export const FEED_ENTRY_CAP = 20; // max top-level entries (calendar group counts as one) — bounds length
export const CALENDAR_SUBROW_CAP = 10; // max sub-rows inside the expanded calendar group
export const FEED_EVENT_WINDOW_DAYS = 28; // calendar detection window
export const LAST_SEEN_KEY = "family-hub-activity-last-seen";
export const HIDDEN_AT_KEY = "family-hub-activity-hidden-at";

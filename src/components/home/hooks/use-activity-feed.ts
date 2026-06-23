import { addDays, startOfDay } from "date-fns";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCalendarEvents, useLists } from "@/api";
import {
  ACTIVITY_WINDOW_MS,
  CALENDAR_SUBROW_CAP,
  FEED_ENTRY_CAP,
  FEED_EVENT_WINDOW_DAYS,
  STALE_RESEED_MS,
} from "@/lib/home-activity/constants";
import {
  diffSnapshots,
  mergeLog,
  pruneLog,
  reconcileLog,
} from "@/lib/home-activity/diff";
import { buildFeed } from "@/lib/home-activity/group";
import {
  getHiddenAt,
  getLastSeen,
  isMeaningfulOpen,
  setHiddenAt,
  setLastSeen,
} from "@/lib/home-activity/markers";
import { buildSnapshot } from "@/lib/home-activity/normalize";
import {
  loadActivityState,
  saveActivityState,
} from "@/lib/home-activity/store";
import type {
  ActivityState,
  EventWindow,
  Feed,
} from "@/lib/home-activity/types";
import { formatLocalDate } from "@/lib/time-utils";
import type { CalendarEvent, ListSummary } from "@/lib/types";

interface ActivityIo {
  loadState: () => Promise<ActivityState | null>;
  saveState: (s: ActivityState) => Promise<void>;
  getLastSeen: () => number;
  setLastSeen: (v: number) => void;
  getHiddenAt: () => number;
  setHiddenAt: (v: number) => void;
}

const defaultIo: ActivityIo = {
  loadState: loadActivityState,
  saveState: saveActivityState,
  getLastSeen,
  setLastSeen,
  getHiddenAt,
  setHiddenAt,
};

const EMPTY_FEED: Feed = { groups: [], dividerAfter: -1, overflow: 0 };
// Stable identities so the detection effect does not re-fire every render while a
// query is still loading (a fresh `?? []` would be a new reference each time).
const EMPTY_EVENTS: CalendarEvent[] = [];
const EMPTY_LISTS: ListSummary[] = [];

/** Freshly-refetched arrays threaded into a return-to-visible cycle so it diffs the
 * refreshed data directly, rather than the pre-refetch render's closure. */
interface FreshData {
  events: CalendarEvent[];
  lists: ListSummary[];
}

/** Overlap of the previous and current detection windows (yyyy-MM-dd strings). */
function overlapOf(prev: EventWindow, curr: EventWindow): EventWindow {
  return {
    start: prev.start > curr.start ? prev.start : curr.start,
    end: prev.end < curr.end ? prev.end : curr.end,
  };
}

export function useActivityFeed({
  io = defaultIo,
  nowProvider,
}: {
  io?: ActivityIo;
  nowProvider?: () => number;
} = {}) {
  // Stabilize nowProvider so the visibility listener is not torn down each render.
  const nowRef = useRef(nowProvider ?? (() => Date.now()));
  nowRef.current = nowProvider ?? nowRef.current;
  const now = useCallback(() => nowRef.current(), []);

  // Memoize the query range by a local-date STRING — startOfDay(new Date()) is a
  // new reference every render, which would churn the query key and effects.
  const todayStr = formatLocalDate(new Date(now()));
  // `now` is a stable useCallback ref that never changes identity, so without
  // `todayStr` the memo would never recompute when the calendar date rolls over.
  // biome-ignore lint/correctness/useExhaustiveDependencies: todayStr is intentional
  const range = useMemo<EventWindow>(() => {
    const today = startOfDay(new Date(now()));
    return {
      start: formatLocalDate(today),
      end: formatLocalDate(addDays(today, FEED_EVENT_WINDOW_DAYS)),
    };
  }, [todayStr, now]);

  const eventsQuery = useCalendarEvents({
    startDate: range.start,
    endDate: range.end,
  });
  const listsQuery = useLists();
  const settled = eventsQuery.isSuccess && listsQuery.isSuccess;
  const events = eventsQuery.data?.data ?? EMPTY_EVENTS;
  const lists = listsQuery.data?.data ?? EMPTY_LISTS;

  const [feed, setFeed] = useState<Feed>(EMPTY_FEED);
  const [meaningfulOpenId, setMeaningfulOpenId] = useState(0); // bump → reset ephemeral expansion
  const coldStartRef = useRef(true);
  // Mutex: every cycle (cold start, data change, return-to-visible) is chained
  // through this promise so a cycle's load→diff→save runs to completion before the
  // next begins. The newest-queued cycle therefore writes LAST and wins — a slow
  // earlier save can never land after a newer one (the generation guard alone did
  // not prevent this: two saves already in flight could resolve out of order).
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  // The divider baseline is frozen at the `lastSeen` of the most recent meaningful
  // OPEN and reused by every cycle in between. A background data-change cycle or a
  // quick peek must NOT move the divider, so renders never reread the advanced
  // marker — they read this ref.
  const displayBaselineRef = useRef<number | null>(null);
  // Last feed committed to state. `render` skips setFeed when a cycle produces a
  // structurally identical feed, so a no-op cycle (e.g. a return-to-visible that
  // found nothing new) does not mint a new Feed object. A new `feed` identity
  // would force a re-render and churn the cycle count the orchestration tests
  // assert. This is primarily render-count stability — not a correctness gate:
  // `newest` (max detectedAt) advances on any real change, so genuine updates
  // always render.
  const lastRenderedFeedRef = useRef<Feed>(EMPTY_FEED);

  const render = useCallback((log: ActivityState["log"]) => {
    const next = buildFeed(
      log,
      displayBaselineRef.current ?? 0,
      FEED_ENTRY_CAP,
      CALENDAR_SUBROW_CAP,
    );
    const prev = lastRenderedFeedRef.current;
    // Skip setFeed entirely when the feed is structurally unchanged: minting a new
    // Feed object on a no-op cycle would re-render needlessly and churn the
    // orchestration tests' cycle count. `newest`, `summary`, `dividerAfter`, and
    // `overflow` together version the feed, so any real change is still rendered.
    if (
      prev.groups.length === next.groups.length &&
      prev.dividerAfter === next.dividerAfter &&
      prev.overflow === next.overflow &&
      // length already confirmed equal above, so next.groups[i] is always defined
      prev.groups.every(
        (g, i) =>
          g.id === next.groups[i].id &&
          g.newest === next.groups[i].newest &&
          g.summary === next.groups[i].summary &&
          g.rows.length === next.groups[i].rows.length,
      )
    ) {
      return;
    }
    lastRenderedFeedRef.current = next;
    setFeed(next);
  }, []);

  // One cycle's critical section. Serialized by `queueRef`, so no other cycle's
  // load/save can interleave with this one. `override` carries the just-refetched
  // arrays for a return-to-visible cycle: the visibility handler `await`s the
  // refetch, but the hook has not re-rendered yet, so the closure's `events`/`lists`
  // are still pre-refetch. Diffing those would surface nothing while still advancing
  // `lastSeen`, leaving the real change to be stamped LATER by the follow-up auto
  // cycle — reading as "new" for an extra open. Threading the refetch result in
  // makes the open diff fresh data (spec §4: "refetch … then detect").
  const runCycle = useCallback(
    async (trigger: "auto" | "visible", override?: FreshData) => {
      const prior = await io.loadState();

      // Gate: never diff partial data. Render whatever is persisted and wait.
      if (!settled) {
        if (prior) {
          if (displayBaselineRef.current === null)
            displayBaselineRef.current = io.getLastSeen();
          render(prior.log);
        }
        return;
      }

      const ts = now();
      const fresh = buildSnapshot(
        override?.events ?? events,
        override?.lists ?? lists,
      );

      // First run / long absence → reseed silently (no "added" dump).
      if (!prior || ts - prior.snapshotSavedAt > STALE_RESEED_MS) {
        await io.saveState({
          snapshot: fresh,
          log: [],
          snapshotSavedAt: ts,
          eventWindow: range,
        });
        io.setLastSeen(ts);
        displayBaselineRef.current = ts; // nothing is "new" yet
        coldStartRef.current = false;
        setFeed(EMPTY_FEED);
        return;
      }

      // Window-bounds-aware diff AND reconcile: an event that merely aged out of the
      // sliding window must be neither reported (diff) nor dropped/demoted (reconcile)
      // — it is preserved until normal 48h pruning (§4.4).
      const overlap = overlapOf(prior.eventWindow, range);
      const deltas = diffSnapshots(fresh, prior.snapshot, ts, overlap);
      let log = mergeLog(prior.log, deltas); // merge BEFORE reconcile so add+remove net-cancels
      log = reconcileLog(log, new Set(Object.keys(fresh)), range); // preserve out-of-window entries
      log = pruneLog(log, ts, ACTIVITY_WINDOW_MS);
      await io.saveState({
        snapshot: fresh,
        log,
        snapshotSavedAt: ts,
        eventWindow: range,
      });

      // Classify the OPEN, not the data change. Only a real open advances the divider.
      const isOpenEvent = trigger === "visible" || coldStartRef.current;
      const meaningful =
        isOpenEvent &&
        isMeaningfulOpen({
          coldStart: coldStartRef.current,
          now: ts,
          hiddenAt: io.getHiddenAt(),
          lastSeen: io.getLastSeen(),
        });
      // Freeze the baseline at THIS open's pre-advance lastSeen; later non-open
      // cycles reuse it, so the divider holds until the next real open.
      if (meaningful || displayBaselineRef.current === null) {
        displayBaselineRef.current = io.getLastSeen();
      }
      render(log);
      if (meaningful) {
        io.setLastSeen(ts); // advance the persisted marker AFTER capturing the baseline
        setMeaningfulOpenId((n) => n + 1); // reset ephemeral expansion on a real open
      }
      coldStartRef.current = false;
    },
    [io, now, settled, events, lists, range, render],
  );

  // Enqueue a cycle behind the mutex. We deliberately run every queued cycle (no
  // gen-skip): cycles are cheap in-memory diffs, and a meaningful-open cycle must
  // never be skipped because a data-change cycle queued right after it.
  const detect = useCallback(
    (trigger: "auto" | "visible", override?: FreshData) => {
      const run = queueRef.current.then(() => runCycle(trigger, override));
      queueRef.current = run.catch(() => {}); // keep the chain alive across errors
      return run;
    },
    [runCycle],
  );

  // Stable handles for the visibility listener so it never re-registers on data change.
  const detectRef = useRef(detect);
  detectRef.current = detect;
  // Returns the refreshed arrays so the return-to-visible cycle can diff them
  // directly (the hook has not re-rendered post-refetch, so the closure is stale).
  // Null when either refetch yielded no data — the cycle then falls back to the
  // closure rather than diffing a half-refreshed pair.
  const refetchRef = useRef<() => Promise<FreshData | null>>(async () => null);
  refetchRef.current = async () => {
    const [e, l] = await Promise.all([
      eventsQuery.refetch(),
      listsQuery.refetch(),
    ]);
    const freshEvents = e.data?.data;
    const freshLists = l.data?.data;
    if (!freshEvents || !freshLists) return null;
    return { events: freshEvents, lists: freshLists };
  };

  // Cold-start + data-change cycles. `detect` changes identity when events/lists/
  // range/settled change, which is the data-change trigger.
  useEffect(() => {
    void detect("auto");
  }, [detect]);

  // Hide → record hiddenAt. Visible → refetch (focus refetch is off app-wide),
  // THEN detect as an open. Registered once; reads the latest detect/refetch via refs.
  useEffect(() => {
    async function onVisibility() {
      if (document.visibilityState === "hidden") {
        io.setHiddenAt(now());
      } else {
        // Refetch both sources, THEN diff the refreshed arrays in this same open
        // cycle (threaded in via `override`). The hook has not re-rendered yet, so
        // the closure is still pre-refetch — diffing it would surface nothing while
        // advancing `lastSeen`, leaving the change to be stamped later and read as
        // "new" for an extra open. Passing the refetch result keeps the open's diff
        // and its `lastSeen` advance on the same data (spec §4).
        const fresh = await refetchRef.current();
        void detectRef.current("visible", fresh ?? undefined);
      }
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [io, now]);

  return { feed, meaningfulOpenId };
}

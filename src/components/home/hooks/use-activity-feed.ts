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
  // load/save can interleave with this one.
  const runCycle = useCallback(
    async (trigger: "auto" | "visible") => {
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
      const fresh = buildSnapshot(events, lists);

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
    (trigger: "auto" | "visible") => {
      const run = queueRef.current.then(() => runCycle(trigger));
      queueRef.current = run.catch(() => {}); // keep the chain alive across errors
      return run;
    },
    [runCycle],
  );

  // Stable handles for the visibility listener so it never re-registers on data change.
  const detectRef = useRef(detect);
  detectRef.current = detect;
  const refetchRef = useRef<() => Promise<void>>(async () => {});
  refetchRef.current = async () => {
    await Promise.all([eventsQuery.refetch(), listsQuery.refetch()]);
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
        // Refetch both sources so the NEXT data-change cycle diffs fresh data.
        // The refreshed arrays surface on the following render (TanStack notifies
        // the observer); this "visible" cycle still diffs the pre-refetch snapshot,
        // which matches the plan's freshness model.
        await refetchRef.current();
        void detectRef.current("visible");
      }
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [io, now]);

  return { feed, meaningfulOpenId };
}

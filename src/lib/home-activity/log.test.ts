import { describe, expect, it } from "vitest";
import { mergeLog, pruneLog, reconcileLog } from "./diff";
import type { ActivityItem } from "./types";

const mk = (over: Partial<ActivityItem>): ActivityItem => ({
  storeKey: "calendar:e1",
  module: "calendar",
  kind: "edited",
  title: "Soccer",
  detail: "x",
  detectedAt: 1,
  ...over,
});

describe("mergeLog", () => {
  it("coalesces repeated deltas for one key into the latest entry", () => {
    const log = [mk({ kind: "edited", detail: "old", detectedAt: 1 })];
    const next = mergeLog(log, [
      mk({ kind: "edited", detail: "new", detectedAt: 5 }),
    ]);
    expect(next).toHaveLength(1);
    expect(next[0]).toMatchObject({ detail: "new", detectedAt: 5 });
  });

  it("keeps 'added' when an add is later edited", () => {
    const log = [mk({ kind: "added", detectedAt: 1 })];
    const next = mergeLog(log, [mk({ kind: "edited", detectedAt: 2 })]);
    expect(next[0].kind).toBe("added");
  });

  it("drops an unseen add that is later removed (net no-op)", () => {
    const log = [mk({ kind: "added", detectedAt: 1 })];
    expect(
      mergeLog(log, [mk({ kind: "removed", detectedAt: 2 })]),
    ).toHaveLength(0);
  });

  it("keeps 'removed' when a prior edit is later removed", () => {
    const log = [mk({ kind: "edited", detectedAt: 1 })];
    const next = mergeLog(log, [mk({ kind: "removed", detectedAt: 2 })]);
    expect(next[0].kind).toBe("removed");
  });

  it("promotes 'removed' to 'added' when the same key is re-added", () => {
    const log = [mk({ kind: "removed", detectedAt: 1 })];
    const next = mergeLog(log, [mk({ kind: "added", detectedAt: 2 })]);
    expect(next[0].kind).toBe("added");
  });
});

describe("reconcileLog", () => {
  it("drops a logged 'added' whose key is gone from fresh (phantom add)", () => {
    const log = [mk({ kind: "added", storeKey: "calendar:e1" })];
    expect(reconcileLog(log, new Set())).toHaveLength(0);
  });

  it("demotes a logged 'edited' to 'removed' when the key vanished", () => {
    const log = [mk({ kind: "edited", storeKey: "calendar:e1" })];
    const next = reconcileLog(log, new Set());
    expect(next[0].kind).toBe("removed");
  });

  it("keeps entries whose key still exists", () => {
    const log = [mk({ storeKey: "calendar:e1" })];
    expect(reconcileLog(log, new Set(["calendar:e1"]))).toHaveLength(1);
  });

  it("preserves out-of-window calendar entries instead of dropping/demoting them", () => {
    const window = { start: "2026-06-21", end: "2026-07-19" };
    const log = [
      mk({
        kind: "added",
        storeKey: "calendar:past",
        module: "calendar",
        date: "2026-06-01",
      }), // below start
      mk({
        kind: "edited",
        storeKey: "calendar:future",
        module: "calendar",
        date: "2026-12-31",
      }), // above end
    ];
    const next = reconcileLog(log, new Set(), window); // neither key is in fresh (aged out)
    expect(next).toHaveLength(2);
    expect(next.map((i) => i.kind).sort()).toEqual(["added", "edited"]); // unchanged, not demoted
  });

  it("still drops/demotes an IN-window entry that genuinely vanished", () => {
    const window = { start: "2026-06-21", end: "2026-07-19" };
    const log = [
      mk({
        kind: "edited",
        storeKey: "calendar:gone",
        module: "calendar",
        date: "2026-06-25",
      }),
    ];
    expect(reconcileLog(log, new Set(), window)[0].kind).toBe("removed");
  });

  it("drops a vanished list 'added' (unwindowed)", () => {
    const log = [mk({ kind: "added", storeKey: "lists:l1", module: "lists" })];
    expect(reconcileLog(log, new Set())).toHaveLength(0);
  });

  it("demotes a vanished list 'edited' to 'removed'", () => {
    const log = [mk({ kind: "edited", storeKey: "lists:l1", module: "lists" })];
    expect(reconcileLog(log, new Set())[0].kind).toBe("removed");
  });
});

describe("pruneLog", () => {
  it("drops entries older than maxAge", () => {
    const log = [
      mk({ detectedAt: 0 }),
      mk({ storeKey: "calendar:e2", detectedAt: 100 }),
    ];
    expect(pruneLog(log, 100, 50)).toHaveLength(1);
    expect(pruneLog(log, 100, 50)[0].storeKey).toBe("calendar:e2");
  });
});

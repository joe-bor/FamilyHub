import { describe, expect, it } from "vitest";
import { buildFeed } from "./group";
import type { ActivityItem } from "./types";

const cal = (over: Partial<ActivityItem>): ActivityItem => ({
  storeKey: "calendar:e1",
  module: "calendar",
  kind: "added",
  title: "Dentist",
  detail: "Tue 9:00 AM",
  detectedAt: 10,
  ...over,
});
const lst = (over: Partial<ActivityItem>): ActivityItem => ({
  storeKey: "lists:l1",
  module: "lists",
  kind: "edited",
  title: "Groceries",
  detail: "+3 items",
  detectedAt: 20,
  ...over,
});

describe("buildFeed", () => {
  it("coalesces 2+ calendar changes into one expandable group", () => {
    const feed = buildFeed(
      [
        cal({ storeKey: "calendar:a" }),
        cal({ storeKey: "calendar:b", kind: "edited" }),
      ],
      0,
      20,
    );
    const calGroup = feed.groups.find((g) => g.module === "calendar");
    expect(calGroup?.summary).toMatch(/Calendar/);
    expect(calGroup?.rows).toHaveLength(2);
  });

  it("renders a single calendar change directly (one row, no count summary)", () => {
    const feed = buildFeed([cal({})], 0, 20);
    const g = feed.groups[0];
    expect(g.rows).toHaveLength(1);
    expect(g.summary).toContain("Dentist");
  });

  it("collapses identical changes to a recurring series into one sub-row", () => {
    const feed = buildFeed(
      [
        cal({
          storeKey: "calendar:r_1",
          recurringEventId: "r",
          title: "Soccer",
          kind: "edited",
          detail: "5:00 PM",
        }),
        cal({
          storeKey: "calendar:r_2",
          recurringEventId: "r",
          title: "Soccer",
          kind: "edited",
          detail: "5:00 PM",
        }),
      ],
      0,
      20,
    );
    const g = feed.groups.find((x) => x.module === "calendar");
    expect(g?.rows).toHaveLength(1);
  });

  it("keeps DISTINCT changes to the same series as separate sub-rows", () => {
    const feed = buildFeed(
      [
        cal({
          storeKey: "calendar:r_1",
          recurringEventId: "r",
          title: "Soccer",
          kind: "edited",
          detail: "5:00 PM",
        }),
        cal({
          storeKey: "calendar:r_2",
          recurringEventId: "r",
          title: "Soccer",
          kind: "removed",
          detail: "",
        }),
      ],
      0,
      20,
    );
    const g = feed.groups.find((x) => x.module === "calendar");
    expect(g?.rows).toHaveLength(2); // different change signature → not collapsed
  });

  it("caps calendar sub-rows and reports per-group overflow", () => {
    const many = Array.from({ length: 14 }, (_, i) =>
      cal({ storeKey: `calendar:e${i}`, title: `Event ${i}`, detail: `d${i}` }),
    );
    const feed = buildFeed(many, 0, 20, 10); // subRowCap = 10
    const g = feed.groups.find((x) => x.module === "calendar");
    expect(g?.rows).toHaveLength(10);
    expect(g?.rowsOverflow).toBe(4);
    expect(g?.summary).toContain("14 added"); // count is over ALL items, not the shown 10
  });

  it("gives each changed list its own group", () => {
    const feed = buildFeed(
      [
        lst({ storeKey: "lists:a" }),
        lst({ storeKey: "lists:b", title: "Camping" }),
      ],
      0,
      20,
    );
    expect(feed.groups.filter((g) => g.module === "lists")).toHaveLength(2);
  });

  it("orders newest-first and places the divider after the last 'new' group", () => {
    const feed = buildFeed(
      [cal({ detectedAt: 30 }), lst({ detectedAt: 10 })],
      20,
      20,
    );
    expect(feed.groups[0].newest).toBe(30); // calendar (new) first
    expect(feed.dividerAfter).toBe(0); // divider after the one new group
  });

  it("omits the divider when everything is new or everything is earlier", () => {
    expect(buildFeed([cal({ detectedAt: 30 })], 0, 20).dividerAfter).toBe(-1);
    expect(buildFeed([cal({ detectedAt: 5 })], 20, 20).dividerAfter).toBe(-1);
  });

  it("caps groups and reports overflow", () => {
    const many = Array.from({ length: 25 }, (_, i) =>
      lst({ storeKey: `lists:${i}` }),
    );
    const feed = buildFeed(many, 0, 20);
    expect(feed.groups).toHaveLength(20);
    expect(feed.overflow).toBe(5);
  });

  it("summary counts all three kinds independently", () => {
    const feed = buildFeed(
      [
        cal({ storeKey: "calendar:a", kind: "added" }),
        cal({ storeKey: "calendar:b", kind: "edited" }),
        cal({ storeKey: "calendar:c", kind: "removed" }),
      ],
      0,
      20,
    );
    expect(feed.groups[0].summary).toBe(
      "Calendar · 1 added, 1 changed, 1 removed",
    );
  });
});

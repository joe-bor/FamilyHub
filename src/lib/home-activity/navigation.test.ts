import { describe, expect, it } from "vitest";
import type { CalendarEvent } from "@/lib/types";
import { resolveFeedSelection, selectOpenableEvents } from "./navigation";

describe("resolveFeedSelection", () => {
  it("opens the list detail for a list row", () => {
    expect(
      resolveFeedSelection(
        {
          storeKey: "lists:l1",
          module: "lists",
          kind: "edited",
          label: "x",
          entityId: "l1",
        },
        [],
      ),
    ).toEqual({ type: "open-list", listId: "l1" });
  });
  it("opens the event sheet for an in-window calendar row", () => {
    const ev = {
      id: "e1",
      title: "Dentist",
      date: new Date(2026, 5, 23),
    } as CalendarEvent;
    const sel = resolveFeedSelection(
      {
        storeKey: "calendar:e1",
        module: "calendar",
        kind: "added",
        label: "Dentist",
      },
      [ev],
    );
    expect(sel).toEqual({ type: "open-event", event: ev });
  });
  it("focuses the calendar date for an out-of-window calendar row", () => {
    expect(
      resolveFeedSelection(
        {
          storeKey: "calendar:e9",
          module: "calendar",
          kind: "added",
          label: "Camp",
          date: "2026-07-15",
        },
        [],
      ),
    ).toEqual({ type: "focus-calendar", date: "2026-07-15" });
  });
  it("does NOT open a deleted list — a removed list row lands on the Lists module", () => {
    expect(
      resolveFeedSelection(
        {
          storeKey: "lists:l1",
          module: "lists",
          kind: "removed",
          label: "Old",
          entityId: "l1",
        },
        [],
      ),
    ).toEqual({ type: "switch-module", module: "lists" });
  });
  it("a removed calendar row focuses its day, not a deleted event sheet", () => {
    expect(
      resolveFeedSelection(
        {
          storeKey: "calendar:e1",
          module: "calendar",
          kind: "removed",
          label: "Gone",
          date: "2026-06-23",
        },
        [{ id: "e1" } as CalendarEvent],
      ),
    ).toEqual({ type: "focus-calendar", date: "2026-06-23" });
  });
});

describe("selectOpenableEvents", () => {
  const now = new Date(2026, 5, 21, 12); // Jun 21, midday
  const ev = (date: Date, over: Partial<CalendarEvent> = {}): CalendarEvent =>
    ({ id: "e", title: "x", date, memberId: "m1", ...over }) as CalendarEvent;

  it("keeps events from today through today+2 (the openable horizon)", () => {
    const events = [
      ev(new Date(2026, 5, 21)), // today
      ev(new Date(2026, 5, 22)), // tomorrow
      ev(new Date(2026, 5, 23)), // today+2
    ];
    expect(selectOpenableEvents(events, now)).toHaveLength(3);
  });

  it("drops events before today and beyond today+2", () => {
    const events = [
      ev(new Date(2026, 5, 20)), // yesterday
      ev(new Date(2026, 5, 24)), // today+3
    ];
    expect(selectOpenableEvents(events, now)).toHaveLength(0);
  });

  it("is member-agnostic: keeps in-window events for ANY member (M1 regression guard)", () => {
    const events = [
      ev(new Date(2026, 5, 22), { id: "mom-evt", memberId: "mom" }),
      ev(new Date(2026, 5, 22), { id: "dad-evt", memberId: "dad" }),
    ];
    expect(
      selectOpenableEvents(events, now)
        .map((e) => e.id)
        .sort(),
    ).toEqual(["dad-evt", "mom-evt"]);
  });
});

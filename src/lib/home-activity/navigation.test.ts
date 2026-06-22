import { describe, expect, it } from "vitest";
import type { CalendarEvent } from "@/lib/types";
import { resolveFeedSelection } from "./navigation";

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

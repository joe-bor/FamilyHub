import type { Mutation, Query } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import {
  authKeys,
  calendarKeys,
  choreKeys,
  familyKeys,
  googleCalendarKeys,
  listsKeys,
  mealsKeys,
  recipesKeys,
} from "@/api";
import {
  isOfflineReadQueryKey,
  offlineReadDehydrateOptions,
  shouldDehydrateOfflineReadQuery,
} from "./dehydrate";

/**
 * Build a minimal fake Query whose key/status/data drive the allowlist.
 * `data` is passed via rest args so an explicit `undefined` is preserved
 * (a default parameter would silently replace it).
 */
function fakeQuery(
  queryKey: readonly unknown[],
  status: "success" | "pending" | "error" = "success",
  ...data: unknown[]
): Query {
  return {
    queryKey,
    state: { status, data: data.length > 0 ? data[0] : { data: {} } },
  } as unknown as Query;
}

describe("isOfflineReadQueryKey", () => {
  it("allowlists the intended read query families", () => {
    const allowed: readonly unknown[][] = [
      familyKeys.family(),
      calendarKeys.eventList({
        startDate: "2026-01-01",
        endDate: "2026-01-31",
      }),
      calendarKeys.event("event-1"),
      choreKeys.board(),
      listsKeys.hub(),
      listsKeys.detail("list-1"),
      listsKeys.preferences(),
      mealsKeys.board("2026-01-05"),
      recipesKeys.list(),
      recipesKeys.detail("recipe-1"),
    ];

    for (const key of allowed) {
      expect(isOfflineReadQueryKey(key)).toBe(true);
    }
  });

  it("excludes auth, google-calendar, and unknown keys", () => {
    const excluded: readonly unknown[][] = [
      authKeys.all,
      authKeys.usernameCheck("alice"),
      googleCalendarKeys.status("member-1"),
      googleCalendarKeys.calendars("member-1"),
      ["photos", "album", "1"],
      ["family", "settings"], // wrong family sub-key
      ["lists", "categories"], // not an allowlisted lists sub-key
      [],
    ];

    for (const key of excluded) {
      expect(isOfflineReadQueryKey(key)).toBe(false);
    }
  });
});

describe("shouldDehydrateOfflineReadQuery", () => {
  it("persists only successful, allowlisted reads with data", () => {
    expect(shouldDehydrateOfflineReadQuery(fakeQuery(choreKeys.board()))).toBe(
      true,
    );
  });

  it("excludes pending and errored queries", () => {
    expect(
      shouldDehydrateOfflineReadQuery(fakeQuery(choreKeys.board(), "pending")),
    ).toBe(false);
    expect(
      shouldDehydrateOfflineReadQuery(
        fakeQuery(choreKeys.board(), "error", undefined),
      ),
    ).toBe(false);
  });

  it("excludes successful queries that are not allowlisted", () => {
    expect(
      shouldDehydrateOfflineReadQuery(
        fakeQuery(authKeys.usernameCheck("alice")),
      ),
    ).toBe(false);
  });

  it("excludes successful allowlisted queries whose data is undefined", () => {
    expect(
      shouldDehydrateOfflineReadQuery(
        fakeQuery(choreKeys.board(), "success", undefined),
      ),
    ).toBe(false);
  });
});

describe("offlineReadDehydrateOptions", () => {
  it("never dehydrates mutations", () => {
    expect(
      offlineReadDehydrateOptions.shouldDehydrateMutation?.({} as Mutation),
    ).toBe(false);
  });

  it("wires shouldDehydrateQuery to the allowlist", () => {
    expect(
      offlineReadDehydrateOptions.shouldDehydrateQuery?.(
        fakeQuery(familyKeys.family()),
      ),
    ).toBe(true);
    expect(
      offlineReadDehydrateOptions.shouldDehydrateQuery?.(
        fakeQuery(authKeys.all),
      ),
    ).toBe(false);
  });
});

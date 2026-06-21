import { describe, expect, it } from "vitest";
import { MEANINGFUL_GAP_MS } from "./constants";
import {
  getHiddenAt,
  getLastSeen,
  isMeaningfulOpen,
  setHiddenAt,
  setLastSeen,
} from "./markers";

const day = (d: number) => new Date(2026, 5, d, 12, 0, 0).getTime();

describe("isMeaningfulOpen", () => {
  it("is true on cold start", () => {
    expect(
      isMeaningfulOpen({
        coldStart: true,
        now: day(1),
        hiddenAt: day(1),
        lastSeen: day(1),
      }),
    ).toBe(true);
  });
  it("is true when hidden longer than the gap", () => {
    const now = day(1);
    expect(
      isMeaningfulOpen({
        coldStart: false,
        now,
        hiddenAt: now - MEANINGFUL_GAP_MS - 1,
        lastSeen: now - 10,
      }),
    ).toBe(true);
  });
  it("is true when the local day changed since lastSeen", () => {
    expect(
      isMeaningfulOpen({
        coldStart: false,
        now: day(2),
        hiddenAt: day(2) - 1000,
        lastSeen: day(1),
      }),
    ).toBe(true);
  });
  it("is false for a short same-day peek", () => {
    const now = day(1);
    expect(
      isMeaningfulOpen({
        coldStart: false,
        now,
        hiddenAt: now - 5000,
        lastSeen: now - 6000,
      }),
    ).toBe(false);
  });
  it("is false when never hidden (hiddenAt=0) on the same day", () => {
    const now = day(1);
    // hiddenAt=0 must NOT read as "hidden for decades" → not meaningful.
    expect(
      isMeaningfulOpen({
        coldStart: false,
        now,
        hiddenAt: 0,
        lastSeen: now - 5000,
      }),
    ).toBe(false);
  });
  it("is false when hidden exactly at the gap boundary (> not >=)", () => {
    const now = day(1);
    expect(
      isMeaningfulOpen({
        coldStart: false,
        now,
        hiddenAt: now - MEANINGFUL_GAP_MS,
        lastSeen: now - 10,
      }),
    ).toBe(false);
  });
});

describe("marker persistence", () => {
  it("defaults to 0 when unset and round-trips through localStorage", () => {
    expect(getLastSeen()).toBe(0);
    expect(getHiddenAt()).toBe(0);
    setLastSeen(123);
    setHiddenAt(456);
    expect(getLastSeen()).toBe(123);
    expect(getHiddenAt()).toBe(456);
  });
});

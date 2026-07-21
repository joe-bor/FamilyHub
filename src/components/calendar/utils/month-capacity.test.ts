import { describe, expect, it } from "vitest";
import {
  MONTH_MIN_ROW_HEIGHT,
  MONTH_ROW_GAP,
  monthRowHeight,
  monthSlotCapacity,
} from "./month-capacity";

describe("monthSlotCapacity", () => {
  it("guarantees at least 2 slots at the minimum row height", () => {
    expect(monthSlotCapacity(MONTH_MIN_ROW_HEIGHT)).toBeGreaterThanOrEqual(2);
  });

  it("is monotonic in row height", () => {
    let previous = 0;
    for (let h = MONTH_MIN_ROW_HEIGHT; h <= 260; h += 4) {
      const capacity = monthSlotCapacity(h);
      expect(capacity).toBeGreaterThanOrEqual(previous);
      previous = capacity;
    }
  });

  it("yields strictly more slots for a tall row than a short one", () => {
    // Representative of a five-week month at 1440x900 vs a six-week month
    // at 1024x768. Absolute counts are confirmed at the screenshot gate.
    expect(monthSlotCapacity(148)).toBeGreaterThan(monthSlotCapacity(102));
  });

  it("never returns a negative capacity for degenerate heights", () => {
    expect(monthSlotCapacity(0)).toBe(0);
    expect(monthSlotCapacity(-50)).toBe(0);
  });
});

describe("monthRowHeight", () => {
  it("divides the container across the week count", () => {
    expect(monthRowHeight(744, 6)).toBe(124);
  });

  it("applies the minimum row height floor", () => {
    expect(monthRowHeight(300, 6)).toBe(MONTH_MIN_ROW_HEIGHT);
  });

  it("handles a four-row month", () => {
    const rowHeight = monthRowHeight(744, 4, MONTH_ROW_GAP);
    expect(rowHeight).toBe(Math.floor((744 - 3 * MONTH_ROW_GAP) / 4));
    expect(monthSlotCapacity(rowHeight)).toBeGreaterThan(
      monthSlotCapacity(monthRowHeight(744, 6, MONTH_ROW_GAP)),
    );
  });

  it("falls back to the floor for a zero week count", () => {
    expect(monthRowHeight(744, 0)).toBe(MONTH_MIN_ROW_HEIGHT);
  });

  it("subtracts inter-row gaps from the available height", () => {
    // 6 rows have 5 gaps between them. Without this the rows overflow their
    // container by the total gap height and the grid scrolls permanently.
    expect(monthRowHeight(744, 6, MONTH_ROW_GAP)).toBe(
      Math.floor((744 - 5 * MONTH_ROW_GAP) / 6),
    );
  });
});

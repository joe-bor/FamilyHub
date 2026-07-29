import { getContextLabel } from "./context-label";

describe("getContextLabel — schedule", () => {
  it("labels the visible 14-day window rather than a constant", () => {
    expect(getContextLabel("schedule", new Date(2026, 5, 1))).toBe(
      "Jun 1 – 14",
    );
  });

  it("spans a month boundary with both month names", () => {
    expect(getContextLabel("schedule", new Date(2026, 5, 25))).toBe(
      "Jun 25 – Jul 8",
    );
  });

  it("changes when the date pages forward by a week", () => {
    const first = getContextLabel("schedule", new Date(2026, 5, 1));
    const next = getContextLabel("schedule", new Date(2026, 5, 8));
    expect(next).not.toBe(first);
  });
});

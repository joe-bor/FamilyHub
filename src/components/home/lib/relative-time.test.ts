import { formatRelativeStart, formatRemainingEnd } from "./relative-time";

const now = new Date(2026, 3, 25, 9, 0, 0, 0);

describe("formatRelativeStart", () => {
  it("formats starts within an hour in minutes", () => {
    expect(formatRelativeStart(new Date(2026, 3, 25, 9, 38), now)).toBe(
      "in 38 min",
    );
  });

  it("formats starts between one and six hours in hours", () => {
    expect(formatRelativeStart(new Date(2026, 3, 25, 11, 15), now)).toBe(
      "in 2 hrs",
    );
  });

  it("formats starts beyond six hours as an absolute time", () => {
    expect(formatRelativeStart(new Date(2026, 3, 25, 17, 30), now)).toBe(
      "at 5:30 PM",
    );
  });
});

describe("formatRemainingEnd", () => {
  it("formats remaining time within an hour in minutes", () => {
    expect(formatRemainingEnd(new Date(2026, 3, 25, 9, 22), now)).toBe(
      "ends in 22 min",
    );
  });

  it("formats remaining time beyond an hour in hours", () => {
    expect(formatRemainingEnd(new Date(2026, 3, 25, 11, 5), now)).toBe(
      "ends in 2 hrs",
    );
  });
});

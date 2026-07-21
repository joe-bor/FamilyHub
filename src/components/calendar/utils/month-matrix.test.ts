import { expect, it } from "vitest";
import { createTestEvent, testMembers } from "@/test/fixtures";
import {
  buildMonthMatrix,
  selectMonthDayDots,
  selectMonthDayMembers,
} from "./month-matrix";

it("builds a 4x7, 5x7 or 6x7 month matrix covering the current month", () => {
  const matrix = buildMonthMatrix(new Date(2026, 6, 15));

  expect(matrix.length % 7).toBe(0);
  expect(matrix).toHaveLength(35);
  expect(
    matrix.some((day) => day.getMonth() === 6 && day.getDate() === 1),
  ).toBe(true);
  expect(
    matrix.some((day) => day.getMonth() === 6 && day.getDate() === 31),
  ).toBe(true);
});

it("maps each day to unique member colours in family order", () => {
  const july6 = new Date(2026, 6, 6);
  const dots = selectMonthDayDots(
    [
      createTestEvent({
        id: "first",
        date: july6,
        memberId: testMembers[0].id,
      }),
      createTestEvent({
        id: "duplicate-member",
        date: july6,
        memberId: testMembers[0].id,
      }),
      createTestEvent({
        id: "second",
        date: july6,
        memberId: testMembers[1].id,
      }),
    ],
    testMembers,
  );

  expect(dots.get(july6.toDateString())).toEqual([
    testMembers[0].color,
    testMembers[1].color,
  ]);
});

it("derives dot colours from the same members it reports", () => {
  const events = [
    createTestEvent({
      id: "a",
      date: new Date(2026, 2, 8),
      memberId: testMembers[0].id,
    }),
    createTestEvent({
      id: "b",
      date: new Date(2026, 2, 8),
      memberId: testMembers[1].id,
    }),
  ];
  const key = new Date(2026, 2, 8).toDateString();

  const memberList = selectMonthDayMembers(events, testMembers).get(key) ?? [];
  const colors = selectMonthDayDots(events, testMembers).get(key) ?? [];

  expect(colors).toEqual(memberList.map((m) => m.color));
  expect(memberList.map((m) => m.name)).toEqual(["John", "Jane"]);
});

it("builds exactly 4 rows for a 28-day February starting on Sunday", () => {
  // Feb 2026 starts on a Sunday and 2026 is not a leap year, so the month
  // fills exactly four weeks with no leading or trailing padding. It is the
  // only such month between 2024 and 2030.
  const matrix = buildMonthMatrix(new Date(2026, 1, 15));

  expect(matrix).toHaveLength(28);
  expect(matrix[0]).toEqual(new Date(2026, 1, 1));
  expect(matrix[27]).toEqual(new Date(2026, 1, 28));
});

import { describe, expect, it } from "vitest";
import { emptySlotLabel, filledSlotLabel } from "./meal-slot-labels";

describe("filledSlotLabel", () => {
  it("describes a draft slot", () => {
    expect(
      filledSlotLabel({
        mealType: "dinner",
        dayLabel: "Wednesday",
        draftTitle: "Adobo",
        primaryTitle: null,
        firstExtraTitle: null,
      }),
    ).toBe("Draft dinner, Wednesday: Adobo");
  });

  it("describes a primary meal", () => {
    expect(
      filledSlotLabel({
        mealType: "lunch",
        dayLabel: "Monday",
        draftTitle: null,
        primaryTitle: "Sandwich",
        firstExtraTitle: null,
      }),
    ).toBe("Open lunch, Monday: Sandwich");
  });

  it("describes extras-only slots", () => {
    expect(
      filledSlotLabel({
        mealType: "breakfast",
        dayLabel: "Sunday",
        draftTitle: null,
        primaryTitle: null,
        firstExtraTitle: "Fruit",
      }),
    ).toBe("Open breakfast, Sunday: extras - Fruit");
    expect(
      filledSlotLabel({
        mealType: "breakfast",
        dayLabel: "Sunday",
        draftTitle: null,
        primaryTitle: null,
        firstExtraTitle: null,
      }),
    ).toBe("Open breakfast, Sunday: extras");
  });

  it("omits an empty first extra title", () => {
    expect(
      filledSlotLabel({
        mealType: "breakfast",
        dayLabel: "Sunday",
        draftTitle: null,
        primaryTitle: null,
        firstExtraTitle: "",
      }),
    ).toBe("Open breakfast, Sunday: extras");
  });

  it("omits day context when no dayLabel is given", () => {
    expect(
      filledSlotLabel({
        mealType: "lunch",
        draftTitle: null,
        primaryTitle: "Soup",
        firstExtraTitle: null,
      }),
    ).toBe("Open lunch: Soup");
  });
});

describe("emptySlotLabel", () => {
  it("describes an empty slot", () => {
    expect(
      emptySlotLabel({
        mealType: "dinner",
        dayLabel: "Friday",
        hasPendingRecipe: false,
      }),
    ).toBe("Add dinner meal, Friday");
  });

  it("describes recipe placement", () => {
    expect(
      emptySlotLabel({
        mealType: "dinner",
        dayLabel: "Friday",
        hasPendingRecipe: true,
      }),
    ).toBe("Add recipe to dinner, Friday");
  });

  it("omits day context when no dayLabel is given", () => {
    expect(emptySlotLabel({ mealType: "lunch", hasPendingRecipe: false })).toBe(
      "Add lunch meal",
    );
  });
});

import { describe, expect, it } from "vitest";
import {
  duplicateMealSlotSchema,
  mealCollisionModeSchema,
  mealEntrySchema,
  mealTypeSchema,
  moveMealSlotSchema,
  saveMealPlanSchema,
  saveMealPlanSlotSchema,
  toMealEntryRequest,
  upsertMealSlotSchema,
} from "./meals";

describe("meal validation", () => {
  it("keeps meal types lowercase and rejects uppercase wire values", () => {
    expect(mealTypeSchema.parse("breakfast")).toBe("breakfast");
    expect(mealTypeSchema.parse("lunch")).toBe("lunch");
    expect(mealTypeSchema.parse("dinner")).toBe("dinner");

    expect(() => mealTypeSchema.parse("BREAKFAST")).toThrow();
  });

  it("keeps collision modes lowercase and rejects internal enum casing", () => {
    expect(mealCollisionModeSchema.parse("replace_primary")).toBe(
      "replace_primary",
    );
    expect(mealCollisionModeSchema.parse("add_as_extra")).toBe("add_as_extra");

    expect(() => mealCollisionModeSchema.parse("ADD_AS_EXTRA")).toThrow();
  });

  it("requires a quick meal title and normalizes optional quick-meal fields", () => {
    expect(
      mealEntrySchema.safeParse({
        sourceType: "quick",
        recipeId: null,
        title: "",
        imageUrl: null,
        note: null,
      }).success,
    ).toBe(false);

    const entry = mealEntrySchema.parse({
      sourceType: "quick",
      recipeId: null,
      title: "  Leftovers  ",
      imageUrl: "",
      note: "  Add fruit  ",
    });

    expect(toMealEntryRequest(entry)).toEqual({
      sourceType: "quick",
      recipeId: null,
      title: "Leftovers",
      imageUrl: null,
      note: "Add fruit",
    });
  });

  it("allows quick meals to include an http image URL", () => {
    const entry = mealEntrySchema.parse({
      sourceType: "quick",
      recipeId: null,
      title: "Yogurt bowls",
      imageUrl: "https://example.com/yogurt.jpg",
      note: null,
    });

    expect(toMealEntryRequest(entry).imageUrl).toBe(
      "https://example.com/yogurt.jpg",
    );
  });

  it("requires recipe-backed entries to carry a recipe id", () => {
    expect(
      mealEntrySchema.safeParse({
        sourceType: "recipe",
        recipeId: null,
        title: null,
        imageUrl: null,
        note: null,
      }).success,
    ).toBe(false);

    const entry = mealEntrySchema.parse({
      sourceType: "recipe",
      recipeId: "00000000-0000-4000-8000-000000000501",
      title: null,
      imageUrl: null,
      note: null,
    });

    expect(toMealEntryRequest(entry)).toEqual({
      sourceType: "recipe",
      recipeId: "00000000-0000-4000-8000-000000000501",
      title: null,
      imageUrl: null,
      note: null,
    });
  });

  it("validates upsert requests with day bounds, extras defaulting, and nullable collision mode", () => {
    const request = upsertMealSlotSchema.parse({
      weekStartDate: "2026-06-07",
      dayIndex: 6,
      mealType: "dinner",
      primary: {
        sourceType: "quick",
        recipeId: null,
        title: "Pizza",
        imageUrl: null,
        note: null,
      },
      note: "",
      collisionMode: null,
    });

    expect(request.extras).toEqual([]);
    expect(request.note).toBe(null);
    expect(request.collisionMode).toBe(null);

    expect(
      upsertMealSlotSchema.safeParse({
        ...request,
        dayIndex: 7,
      }).success,
    ).toBe(false);
  });

  it("validates move and duplicate requests with explicit collision modes", () => {
    const request = {
      sourceWeekStartDate: "2026-06-07",
      sourceDayIndex: 1,
      sourceMealType: "lunch",
      destinationWeekStartDate: "2026-06-14",
      destinationDayIndex: 2,
      destinationMealType: "dinner",
      collisionMode: "add_as_extra",
    };

    expect(moveMealSlotSchema.parse(request)).toMatchObject(request);
    expect(duplicateMealSlotSchema.parse(request)).toMatchObject(request);

    expect(
      moveMealSlotSchema.safeParse({
        ...request,
        collisionMode: null,
      }).success,
    ).toBe(false);
  });

  it("requires focused meal plan saves to include at least one slot", () => {
    expect(
      saveMealPlanSchema.safeParse({
        weekStartDate: "2026-06-07",
        slots: [],
      }).success,
    ).toBe(false);
  });

  it("rejects focused meal plan saves with more than twenty-one slots", () => {
    const slot = {
      dayIndex: 0,
      mealType: "dinner",
      primary: {
        sourceType: "quick",
        recipeId: null,
        title: "Pasta",
        imageUrl: null,
        note: null,
      },
      extras: [],
      note: null,
    };

    expect(
      saveMealPlanSchema.safeParse({
        weekStartDate: "2026-06-07",
        slots: Array.from({ length: 22 }, () => slot),
      }).success,
    ).toBe(false);
  });

  it("trims quick meal titles and defaults extras for focused meal plan slots", () => {
    const slot = saveMealPlanSlotSchema.parse({
      dayIndex: 2,
      mealType: "dinner",
      primary: {
        sourceType: "quick",
        recipeId: null,
        title: "  Tacos  ",
        imageUrl: null,
        note: null,
      },
      note: "  ",
    });

    expect(slot.primary.title).toBe("Tacos");
    expect(slot.extras).toEqual([]);
    expect(slot.note).toBe(null);
  });

  it("requires recipe-backed focused meal plan slots to carry a UUID recipe id", () => {
    expect(
      saveMealPlanSlotSchema.safeParse({
        dayIndex: 1,
        mealType: "lunch",
        primary: {
          sourceType: "recipe",
          recipeId: "recipe-1",
          title: null,
          imageUrl: null,
          note: null,
        },
        extras: [],
        note: null,
      }).success,
    ).toBe(false);
  });
});

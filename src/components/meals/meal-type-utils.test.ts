import { CookingPot, Croissant, Sandwich } from "lucide-react";
import { describe, expect, it } from "vitest";
import {
  formatMealType,
  mealTypeBandClasses,
  mealTypeIcon,
  mealTypeRailClasses,
} from "./meal-type-utils";

describe("formatMealType", () => {
  it("capitalizes the meal type", () => {
    expect(formatMealType("breakfast")).toBe("Breakfast");
    expect(formatMealType("lunch")).toBe("Lunch");
    expect(formatMealType("dinner")).toBe("Dinner");
  });
});

describe("mealTypeIcon", () => {
  it("maps each meal type to its glyph", () => {
    expect(mealTypeIcon("breakfast")).toBe(Croissant);
    expect(mealTypeIcon("lunch")).toBe(Sandwich);
    expect(mealTypeIcon("dinner")).toBe(CookingPot);
  });
});

describe("mealTypeBandClasses", () => {
  it("returns the tinted band background and foreground", () => {
    expect(mealTypeBandClasses("breakfast")).toBe(
      "bg-meal-breakfast text-meal-breakfast-foreground",
    );
    expect(mealTypeBandClasses("lunch")).toBe(
      "bg-meal-lunch text-meal-lunch-foreground",
    );
    expect(mealTypeBandClasses("dinner")).toBe(
      "bg-meal-dinner text-meal-dinner-foreground",
    );
  });
});

describe("mealTypeRailClasses", () => {
  it("returns the rail label foreground", () => {
    expect(mealTypeRailClasses("breakfast")).toBe(
      "text-meal-breakfast-foreground",
    );
    expect(mealTypeRailClasses("lunch")).toBe("text-meal-lunch-foreground");
    expect(mealTypeRailClasses("dinner")).toBe("text-meal-dinner-foreground");
  });
});

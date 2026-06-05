import { describe, expect, it } from "vitest";
import { recipeFormSchema, toRecipeRequest } from "./recipes";

describe("recipeFormSchema", () => {
  it("requires a nonblank title", () => {
    expect(() => recipeFormSchema.parse({ title: "   " })).toThrow(
      "Recipe title is required",
    );
  });

  it("normalizes optional form fields to API-ready values", () => {
    const formData = recipeFormSchema.parse({
      title: "  Pasta Night  ",
      imageUrl: "",
      note: "   ",
      sourceUrl: "",
      ingredients: ["  noodles  ", "", " sauce "],
      instructions: [" boil ", " ", " toss "],
      tags: [" dinner ", "", " kid favorite "],
    });

    expect(toRecipeRequest(formData)).toEqual({
      title: "Pasta Night",
      imageUrl: null,
      note: null,
      sourceUrl: null,
      ingredients: ["noodles", "sauce"],
      instructions: ["boil", "toss"],
      tags: ["dinner", "kid favorite"],
      favorite: false,
    });
  });

  it("requires recipe URLs to use http or https", () => {
    expect(() =>
      recipeFormSchema.parse({
        title: "Pasta Night",
        imageUrl: "not-a-url",
      }),
    ).toThrow("Enter a valid URL");

    expect(() =>
      recipeFormSchema.parse({
        title: "Pasta Night",
        imageUrl: "ftp://example.com/photo.jpg",
      }),
    ).toThrow("Enter an http or https URL");

    expect(() =>
      recipeFormSchema.parse({
        title: "Pasta Night",
        sourceUrl: "mailto:cook@example.com",
      }),
    ).toThrow("Enter an http or https URL");

    expect(
      recipeFormSchema.parse({
        title: "Pasta Night",
        imageUrl: "https://example.com/photo.jpg",
        sourceUrl: "http://example.com/recipe",
      }),
    ).toMatchObject({
      imageUrl: "https://example.com/photo.jpg",
      sourceUrl: "http://example.com/recipe",
    });
  });

  it("preserves ordered ingredients, instructions, and tags", () => {
    const formData = recipeFormSchema.parse({
      title: "Layered Salad",
      ingredients: [" first ", "second", " third "],
      instructions: ["prep", "build", "chill"],
      tags: ["make-ahead", "side", "summer"],
      favorite: true,
    });

    expect(toRecipeRequest(formData)).toMatchObject({
      ingredients: ["first", "second", "third"],
      instructions: ["prep", "build", "chill"],
      tags: ["make-ahead", "side", "summer"],
      favorite: true,
    });
  });

  it("allows long instructions because the released backend has no instruction length limit", () => {
    const longInstruction = "b".repeat(1500);

    const formData = recipeFormSchema.parse({
      title: "Detailed Prep",
      instructions: [longInstruction],
    });

    expect(toRecipeRequest(formData).instructions).toEqual([longInstruction]);
  });

  it("reports an over-length array error on the original field index, even with a blank row before it", () => {
    const result = recipeFormSchema.safeParse({
      title: "Big Recipe",
      ingredients: ["", "a".repeat(501)],
      tags: ["", "c".repeat(61)],
    });

    expect(result.success).toBe(false);
    if (result.success) return;

    const ingredientIssue = result.error.issues.find(
      (issue) => issue.path[0] === "ingredients",
    );
    const tagIssue = result.error.issues.find(
      (issue) => issue.path[0] === "tags",
    );

    // Index 1 is the field the user actually typed the too-long value into.
    expect(ingredientIssue?.path).toEqual(["ingredients", 1]);
    expect(ingredientIssue?.message).toBe(
      "Ingredient must be 500 characters or less",
    );
    expect(tagIssue?.path).toEqual(["tags", 1]);
    expect(tagIssue?.message).toBe("Tag must be 60 characters or less");
  });
});

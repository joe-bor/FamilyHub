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
});

import { describe, expect, it } from "vitest";
import { categoryNameSchema, listCreateSchema, listItemSchema } from "./lists";

describe("listCreateSchema", () => {
  it("trims name and requires a kind", () => {
    expect(
      listCreateSchema.parse({ name: "  Trader Joe's Run  ", kind: "grocery" }),
    ).toEqual({
      name: "Trader Joe's Run",
      kind: "grocery",
    });
  });

  it("rejects empty names", () => {
    expect(() =>
      listCreateSchema.parse({ name: "   ", kind: "grocery" }),
    ).toThrow("List name is required");
  });

  it("rejects unsupported list kinds", () => {
    expect(() =>
      listCreateSchema.parse({ name: "Store Run", kind: "chores" }),
    ).toThrow();
  });
});

describe("listItemSchema", () => {
  it("trims item text and keeps an optional category", () => {
    expect(
      listItemSchema.parse({
        text: "  Bananas  ",
        categoryId: "00000000-0000-4000-8000-000000000001",
      }),
    ).toEqual({
      text: "Bananas",
      categoryId: "00000000-0000-4000-8000-000000000001",
    });
  });

  it("allows uncategorized items", () => {
    expect(listItemSchema.parse({ text: "Call dentist" })).toEqual({
      text: "Call dentist",
    });
  });

  it("rejects empty item text", () => {
    expect(() => listItemSchema.parse({ text: "   " })).toThrow(
      "Item text is required",
    );
  });
});

describe("categoryNameSchema", () => {
  it("trims and accepts a valid category name", () => {
    expect(categoryNameSchema.parse("  Produce  ")).toBe("Produce");
  });

  it("accepts a name at exactly 100 characters", () => {
    const name = "a".repeat(100);
    expect(categoryNameSchema.parse(name)).toBe(name);
  });

  it("rejects empty or whitespace-only names", () => {
    expect(() => categoryNameSchema.parse("")).toThrow(
      "Category name is required",
    );
    expect(() => categoryNameSchema.parse("   ")).toThrow(
      "Category name is required",
    );
  });

  it("rejects names over 100 characters", () => {
    expect(() => categoryNameSchema.parse("a".repeat(101))).toThrow(
      "Category name must be 100 characters or less",
    );
  });
});

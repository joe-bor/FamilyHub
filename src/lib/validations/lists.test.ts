import { describe, expect, it } from "vitest";
import { listCreateSchema, listItemSchema } from "./lists";

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

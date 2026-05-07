import { describe, expect, it } from "vitest";
import type { ListDetail } from "@/lib/types";
import { buildListSections } from "./build-list-sections";

const baseList: ListDetail = {
  id: "list-1",
  name: "Trader Joe's Run",
  kind: "grocery",
  categoryDisplayMode: "grouped",
  showCompletedOverride: null,
  categories: [
    {
      id: "produce",
      kind: "grocery",
      name: "Produce",
      seeded: true,
      sortOrder: 0,
    },
    { id: "dairy", kind: "grocery", name: "Dairy", seeded: true, sortOrder: 1 },
  ],
  items: [
    {
      id: "1",
      text: "Bananas",
      completed: false,
      completedAt: null,
      categoryId: "produce",
      createdAt: "2026-05-06T09:00:00",
      updatedAt: "2026-05-06T09:00:00",
    },
    {
      id: "2",
      text: "Spinach",
      completed: true,
      completedAt: "2026-05-06T10:00:00",
      categoryId: "produce",
      createdAt: "2026-05-06T09:05:00",
      updatedAt: "2026-05-06T10:00:00",
    },
    {
      id: "3",
      text: "Paper towels",
      completed: false,
      completedAt: null,
      categoryId: null,
      createdAt: "2026-05-06T09:10:00",
      updatedAt: "2026-05-06T09:10:00",
    },
  ],
  createdAt: "2026-05-06T09:00:00",
  updatedAt: "2026-05-06T09:10:00",
};

describe("buildListSections", () => {
  it("groups grocery items by seeded categories and keeps completed items last within a section", () => {
    const sections = buildListSections({
      list: baseList,
      showCompleted: true,
    });

    expect(sections.map((section) => section.title)).toEqual([
      "Produce",
      "Uncategorized",
    ]);
    expect(sections[0].items.map((item) => item.text)).toEqual([
      "Bananas",
      "Spinach",
    ]);
  });

  it("hides completed items when visibility resolves to false", () => {
    const sections = buildListSections({
      list: {
        ...baseList,
        categoryDisplayMode: "flat",
      },
      showCompleted: false,
    });

    expect(sections[0].items.map((item) => item.text)).toEqual([
      "Bananas",
      "Paper towels",
    ]);
  });

  it("renders general lists as one flat section even if data contains categories", () => {
    const sections = buildListSections({
      list: {
        ...baseList,
        kind: "general",
        categoryDisplayMode: "grouped",
        categories: [],
      },
      showCompleted: true,
    });

    expect(sections).toHaveLength(1);
    expect(sections[0].title).toBeNull();
    expect(sections[0].items.map((item) => item.text)).toEqual([
      "Bananas",
      "Paper towels",
      "Spinach",
    ]);
  });
});

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
      sortOrder: 0,
    },
    { id: "dairy", kind: "grocery", name: "Dairy", sortOrder: 1 },
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
  it("groups grocery items by categories and keeps completed items last within a section", () => {
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

  it("renders general lists as one flat section when categoryDisplayMode is flat", () => {
    const sections = buildListSections({
      list: {
        ...baseList,
        kind: "general",
        categoryDisplayMode: "flat",
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

  it("groups General list items by categories when categoryDisplayMode is grouped", () => {
    const generalGroupedList: ListDetail = {
      ...baseList,
      kind: "general",
      categoryDisplayMode: "grouped",
      categories: [
        { id: "alpha", kind: "general", name: "Alpha", sortOrder: 0 },
        { id: "beta", kind: "general", name: "Beta", sortOrder: 1 },
      ],
      items: [
        {
          id: "10",
          text: "Alpha item",
          completed: false,
          completedAt: null,
          categoryId: "alpha",
          createdAt: "2026-05-06T09:00:00",
          updatedAt: "2026-05-06T09:00:00",
        },
        {
          id: "11",
          text: "Beta item",
          completed: false,
          completedAt: null,
          categoryId: "beta",
          createdAt: "2026-05-06T09:01:00",
          updatedAt: "2026-05-06T09:01:00",
        },
      ],
    };

    const sections = buildListSections({
      list: generalGroupedList,
      showCompleted: true,
    });

    expect(sections.map((s) => s.title)).toEqual(["Alpha", "Beta"]);
    expect(sections[0].items.map((i) => i.text)).toEqual(["Alpha item"]);
    expect(sections[1].items.map((i) => i.text)).toEqual(["Beta item"]);
  });

  it("follows catalog order for General grouped sections", () => {
    const generalGroupedList: ListDetail = {
      ...baseList,
      kind: "general",
      categoryDisplayMode: "grouped",
      categories: [
        { id: "z-cat", kind: "general", name: "Zap", sortOrder: 0 },
        { id: "a-cat", kind: "general", name: "Ant", sortOrder: 1 },
      ],
      items: [
        {
          id: "20",
          text: "Ant item",
          completed: false,
          completedAt: null,
          categoryId: "a-cat",
          createdAt: "2026-05-06T09:00:00",
          updatedAt: "2026-05-06T09:00:00",
        },
        {
          id: "21",
          text: "Zap item",
          completed: false,
          completedAt: null,
          categoryId: "z-cat",
          createdAt: "2026-05-06T09:01:00",
          updatedAt: "2026-05-06T09:01:00",
        },
      ],
    };

    const sections = buildListSections({
      list: generalGroupedList,
      showCompleted: true,
    });

    // Sections follow catalog order (sortOrder), not alphabetical
    expect(sections.map((s) => s.title)).toEqual(["Zap", "Ant"]);
  });

  it("omits empty category groups from General grouped sections", () => {
    const generalGroupedList: ListDetail = {
      ...baseList,
      kind: "general",
      categoryDisplayMode: "grouped",
      categories: [
        { id: "empty-cat", kind: "general", name: "Empty", sortOrder: 0 },
        { id: "full-cat", kind: "general", name: "Full", sortOrder: 1 },
      ],
      items: [
        {
          id: "30",
          text: "Full item",
          completed: false,
          completedAt: null,
          categoryId: "full-cat",
          createdAt: "2026-05-06T09:00:00",
          updatedAt: "2026-05-06T09:00:00",
        },
      ],
    };

    const sections = buildListSections({
      list: generalGroupedList,
      showCompleted: true,
    });

    expect(sections.map((s) => s.title)).toEqual(["Full"]);
  });

  it("adds synthetic Uncategorized section for General grouped only when non-empty", () => {
    const generalGroupedList: ListDetail = {
      ...baseList,
      kind: "general",
      categoryDisplayMode: "grouped",
      categories: [
        { id: "cat-1", kind: "general", name: "Tasks", sortOrder: 0 },
      ],
      items: [
        {
          id: "40",
          text: "Categorized item",
          completed: false,
          completedAt: null,
          categoryId: "cat-1",
          createdAt: "2026-05-06T09:00:00",
          updatedAt: "2026-05-06T09:00:00",
        },
        {
          id: "41",
          text: "Orphan item",
          completed: false,
          completedAt: null,
          categoryId: null,
          createdAt: "2026-05-06T09:01:00",
          updatedAt: "2026-05-06T09:01:00",
        },
      ],
    };

    const sections = buildListSections({
      list: generalGroupedList,
      showCompleted: true,
    });

    expect(sections.map((s) => s.title)).toEqual(["Tasks", "Uncategorized"]);
    expect(sections[1].items.map((i) => i.text)).toEqual(["Orphan item"]);
  });

  it("flat mode returns single titleless section retaining all item assignments", () => {
    const generalFlatList: ListDetail = {
      ...baseList,
      kind: "general",
      categoryDisplayMode: "flat",
      categories: [
        { id: "cat-1", kind: "general", name: "Tasks", sortOrder: 0 },
      ],
      items: [
        {
          id: "50",
          text: "Cat item",
          completed: false,
          completedAt: null,
          categoryId: "cat-1",
          createdAt: "2026-05-06T09:00:00",
          updatedAt: "2026-05-06T09:00:00",
        },
        {
          id: "51",
          text: "No cat item",
          completed: false,
          completedAt: null,
          categoryId: null,
          createdAt: "2026-05-06T09:01:00",
          updatedAt: "2026-05-06T09:01:00",
        },
      ],
    };

    const sections = buildListSections({
      list: generalFlatList,
      showCompleted: true,
    });

    expect(sections).toHaveLength(1);
    expect(sections[0].title).toBeNull();
    // Both items retained regardless of categoryId assignment
    expect(sections[0].items.map((i) => i.text)).toEqual([
      "Cat item",
      "No cat item",
    ]);
  });
});

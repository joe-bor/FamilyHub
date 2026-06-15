import type { PersistedClient } from "@tanstack/react-query-persist-client";
import { describe, expect, it } from "vitest";
import {
  calendarKeys,
  choreKeys,
  familyKeys,
  listsKeys,
  mealsKeys,
  recipesKeys,
} from "@/api";
import type {
  CalendarEvent,
  ChoresBoard,
  FamilyData,
  ListDetail,
  ListPreferences,
  ListSummary,
  MealBoard,
  RecipeDetail,
  RecipeSummary,
} from "@/lib/types";
import {
  restorePersistedClient,
  sanitizePersistedClient,
  validatePersistedQueryData,
} from "./validators";

// ---------------------------------------------------------------------------
// Sample data matching real cache shapes
// ---------------------------------------------------------------------------

const family: FamilyData = {
  id: "fam-1",
  name: "The Borlongans",
  timezone: "America/Los_Angeles",
  members: [
    { id: "m-1", name: "Alice", color: "coral" },
    { id: "m-2", name: "Bob", color: "teal", avatarUrl: "https://cdn/x.png" },
  ],
  createdAt: "2026-01-01T00:00:00Z",
};

const calendarEvent: CalendarEvent = {
  id: "evt-1",
  title: "Dentist",
  startTime: "09:00",
  endTime: "10:00",
  date: new Date(2026, 0, 5),
  memberId: "m-1",
  isAllDay: false,
};

const choreScope = {
  scope: "TODAY" as const,
  periodStartDate: "2026-01-05",
  periodEndDate: "2026-01-05",
  summary: { total: 0, completed: 0, remaining: 0 },
  assignees: [],
};
const choresBoard: ChoresBoard = {
  timezone: "America/Los_Angeles",
  today: choreScope,
  thisWeek: { ...choreScope, scope: "THIS_WEEK" },
  thisMonth: { ...choreScope, scope: "THIS_MONTH" },
};

const listSummary: ListSummary = {
  id: "l-1",
  name: "Groceries",
  kind: "grocery",
  totalItems: 3,
  completedItems: 1,
};
const listDetail: ListDetail = {
  id: "l-1",
  name: "Groceries",
  kind: "grocery",
  categoryDisplayMode: "grouped",
  showCompletedOverride: null,
  categories: [],
  items: [
    {
      id: "i-1",
      text: "Milk",
      completed: false,
      completedAt: null,
      categoryId: null,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    },
  ],
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};
const listPreferences: ListPreferences = { showCompletedByDefault: true };

const mealBoard: MealBoard = {
  weekStartDate: "2026-01-05",
  days: [{ date: "2026-01-05", dayIndex: 0, slots: [] }],
};

const recipeSummary: RecipeSummary = {
  id: "r-1",
  title: "Pancakes",
  imageUrl: null,
  favorite: false,
  tags: [],
  updatedAt: "2026-01-01T00:00:00Z",
};
const recipeDetail: RecipeDetail = {
  ...recipeSummary,
  ingredients: ["flour"],
  instructions: ["mix"],
  note: null,
  sourceUrl: null,
};

function wrap<T>(data: T) {
  return { data };
}

// ---------------------------------------------------------------------------
// validatePersistedQueryData
// ---------------------------------------------------------------------------

describe("validatePersistedQueryData", () => {
  it("accepts well-formed data for every allowlisted query family", () => {
    const cases: Array<[readonly unknown[], unknown]> = [
      [familyKeys.family(), wrap(family)],
      [familyKeys.family(), wrap(null)], // no family yet is valid
      [
        calendarKeys.eventList({ startDate: "a", endDate: "b" }),
        wrap([calendarEvent]),
      ],
      [calendarKeys.event("evt-1"), wrap(calendarEvent)],
      [choreKeys.board(), wrap(choresBoard)],
      [listsKeys.hub(), wrap([listSummary])],
      [listsKeys.detail("l-1"), wrap(listDetail)],
      [listsKeys.preferences(), wrap(listPreferences)],
      [mealsKeys.board("2026-01-05"), wrap(mealBoard)],
      [recipesKeys.list(), wrap([recipeSummary])],
      [recipesKeys.detail("r-1"), wrap(recipeDetail)],
    ];

    for (const [key, data] of cases) {
      expect(validatePersistedQueryData(key, data)).toBe(true);
    }
  });

  it("rejects malformed data for each family", () => {
    const cases: Array<[readonly unknown[], unknown]> = [
      [familyKeys.family(), wrap({ name: "no id" })],
      [calendarKeys.eventList({ startDate: "a", endDate: "b" }), wrap("nope")],
      [calendarKeys.eventList({ startDate: "a", endDate: "b" }), wrap([{}])],
      [choreKeys.board(), wrap({ today: {} })],
      [listsKeys.hub(), wrap([{ id: 1 }])],
      [listsKeys.detail("l-1"), wrap({ id: "l-1" })],
      [listsKeys.preferences(), wrap({ showCompletedByDefault: "yes" })],
      [mealsKeys.board("2026-01-05"), wrap({ days: "nope" })],
      [recipesKeys.list(), wrap([{ id: "r-1" }])],
      [recipesKeys.detail("r-1"), wrap({ title: "no id" })],
    ];

    for (const [key, data] of cases) {
      expect(validatePersistedQueryData(key, data)).toBe(false);
    }
  });

  it("tolerates backend enum drift (new color/kind/scope) without dropping the cache", () => {
    const familyNewColor = {
      ...family,
      members: [{ id: "m-9", name: "Zed", color: "chartreuse" }],
    };
    const listNewKind = { ...listSummary, kind: "wishlist" };
    const choresNewScope = {
      ...choresBoard,
      today: { ...choreScope, scope: "THIS_QUARTER" },
    };

    expect(
      validatePersistedQueryData(familyKeys.family(), wrap(familyNewColor)),
    ).toBe(true);
    expect(
      validatePersistedQueryData(listsKeys.hub(), wrap([listNewKind])),
    ).toBe(true);
    expect(
      validatePersistedQueryData(choreKeys.board(), wrap(choresNewScope)),
    ).toBe(true);
  });

  it("rejects missing wrapper and unknown query families", () => {
    expect(validatePersistedQueryData(familyKeys.family(), undefined)).toBe(
      false,
    );
    expect(validatePersistedQueryData(familyKeys.family(), { foo: 1 })).toBe(
      false,
    );
    expect(validatePersistedQueryData(["auth", "session"], wrap({}))).toBe(
      false,
    );
  });
});

// ---------------------------------------------------------------------------
// sanitizePersistedClient (strip data: URL avatars)
// ---------------------------------------------------------------------------

function clientWith(
  queries: Array<{ queryKey: readonly unknown[]; data: unknown }>,
): PersistedClient {
  return {
    timestamp: Date.now(),
    buster: "test",
    clientState: {
      mutations: [],
      queries: queries.map((q) => ({
        queryKey: q.queryKey,
        queryHash: JSON.stringify(q.queryKey),
        state: { data: q.data, status: "success" },
      })),
    },
  } as unknown as PersistedClient;
}

describe("sanitizePersistedClient", () => {
  it("strips data: URL avatars from the family query but keeps http(s) URLs", () => {
    const client = clientWith([
      {
        queryKey: familyKeys.family(),
        data: wrap({
          ...family,
          members: [
            {
              id: "m-1",
              name: "Alice",
              color: "coral",
              avatarUrl: "data:image/png;base64,AAAA",
            },
            {
              id: "m-2",
              name: "Bob",
              color: "teal",
              avatarUrl: "https://cdn/x.png",
            },
          ],
        }),
      },
    ]);

    const sanitized = sanitizePersistedClient(client);
    const members = (
      sanitized.clientState.queries[0].state.data as { data: FamilyData }
    ).data.members;

    expect(members[0].avatarUrl).toBeUndefined();
    expect(members[1].avatarUrl).toBe("https://cdn/x.png");
  });

  it("does not mutate the input client (live cache must stay intact)", () => {
    const client = clientWith([
      {
        queryKey: familyKeys.family(),
        data: wrap({
          ...family,
          members: [
            {
              id: "m-1",
              name: "Alice",
              color: "coral",
              avatarUrl: "data:image/png;base64,AAAA",
            },
          ],
        }),
      },
    ]);

    sanitizePersistedClient(client);
    const original = (
      client.clientState.queries[0].state.data as { data: FamilyData }
    ).data.members[0];
    expect(original.avatarUrl).toBe("data:image/png;base64,AAAA");
  });

  it("nulls data: URL recipe images in the list but keeps http(s) URLs", () => {
    const client = clientWith([
      {
        queryKey: recipesKeys.list(),
        data: wrap([
          {
            ...recipeSummary,
            id: "r-1",
            imageUrl: "data:image/png;base64,AAAA",
          },
          { ...recipeSummary, id: "r-2", imageUrl: "https://cdn/r.png" },
        ]),
      },
    ]);

    const recipes = (
      sanitizePersistedClient(client).clientState.queries[0].state.data as {
        data: RecipeSummary[];
      }
    ).data;

    expect(recipes[0].imageUrl).toBeNull();
    expect(recipes[1].imageUrl).toBe("https://cdn/r.png");
  });

  it("nulls a data: URL recipe image in the detail view", () => {
    const client = clientWith([
      {
        queryKey: recipesKeys.detail("r-1"),
        data: wrap({ ...recipeDetail, imageUrl: "data:image/png;base64,AAAA" }),
      },
    ]);

    const recipe = (
      sanitizePersistedClient(client).clientState.queries[0].state.data as {
        data: RecipeDetail;
      }
    ).data;

    expect(recipe.imageUrl).toBeNull();
  });

  it("leaves recipes without data: images untouched (same reference)", () => {
    const data = wrap([recipeSummary]); // imageUrl is null
    const client = clientWith([{ queryKey: recipesKeys.list(), data }]);
    expect(
      sanitizePersistedClient(client).clientState.queries[0].state.data,
    ).toBe(data);
  });
});

// ---------------------------------------------------------------------------
// restorePersistedClient (validate + filter on hydration)
// ---------------------------------------------------------------------------

describe("restorePersistedClient", () => {
  it("keeps valid queries and drops malformed ones", () => {
    const client = clientWith([
      { queryKey: familyKeys.family(), data: wrap(family) },
      { queryKey: choreKeys.board(), data: wrap({ broken: true }) },
      { queryKey: recipesKeys.list(), data: wrap([recipeSummary]) },
    ]);

    const restored = restorePersistedClient(client);

    expect(restored).toBeDefined();
    const keys = restored?.clientState.queries.map((q) => q.queryKey[0]);
    expect(keys).toEqual(["family", "recipes"]);
  });

  it("drops malformed ENTRIES from array families but keeps the query", () => {
    const goodEvent = calendarEvent;
    const badEvent = { id: "evt-2", title: "Missing fields" };
    const client = clientWith([
      {
        queryKey: calendarKeys.eventList({ startDate: "a", endDate: "b" }),
        data: wrap([goodEvent, badEvent]),
      },
    ]);

    const restored = restorePersistedClient(client);
    const events = (
      restored?.clientState.queries[0].state.data as {
        data: CalendarEvent[];
      }
    ).data;

    // One bad event must not discard the whole month's offline calendar.
    expect(restored?.clientState.queries).toHaveLength(1);
    expect(events).toHaveLength(1);
    expect(events[0].id).toBe("evt-1");
  });

  it("filters bad entries for lists hub and recipes list too", () => {
    const client = clientWith([
      {
        queryKey: listsKeys.hub(),
        data: wrap([listSummary, { id: 1 }]),
      },
      {
        queryKey: recipesKeys.list(),
        data: wrap([recipeSummary, { id: "r-2" }]),
      },
    ]);

    const restored = restorePersistedClient(client);
    const lists = restored?.clientState.queries[0].state.data as {
      data: ListSummary[];
    };
    const recipes = restored?.clientState.queries[1].state.data as {
      data: RecipeSummary[];
    };

    expect(lists.data).toHaveLength(1);
    expect(lists.data[0].id).toBe("l-1");
    expect(recipes.data).toHaveLength(1);
    expect(recipes.data[0].id).toBe("r-1");
  });

  it("keeps the original data reference when every array entry is valid", () => {
    const data = wrap([calendarEvent]);
    const client = clientWith([
      {
        queryKey: calendarKeys.eventList({ startDate: "a", endDate: "b" }),
        data,
      },
    ]);

    const restored = restorePersistedClient(client);
    // No filtering → same reference, so extra fields the UI relies on survive.
    expect(restored?.clientState.queries[0].state.data).toBe(data);
  });

  it("drops an array family whose envelope is not { data: [] }", () => {
    const client = clientWith([
      { queryKey: familyKeys.family(), data: wrap(family) },
      {
        queryKey: calendarKeys.eventList({ startDate: "a", endDate: "b" }),
        data: wrap("not-an-array"),
      },
    ]);

    const restored = restorePersistedClient(client);
    const keys = restored?.clientState.queries.map((q) => q.queryKey[0]);
    expect(keys).toEqual(["family"]);
  });

  it("still drops object families wholesale on any malformed field", () => {
    // Object families (chores) are not entry-filtered: a broken board is dropped.
    const client = clientWith([
      { queryKey: choreKeys.board(), data: wrap({ today: {} }) },
    ]);
    const restored = restorePersistedClient(client);
    expect(restored?.clientState.queries).toHaveLength(0);
  });

  it("returns undefined for a structurally corrupt client", () => {
    expect(restorePersistedClient(null)).toBeUndefined();
    expect(restorePersistedClient({})).toBeUndefined();
    expect(
      restorePersistedClient({ clientState: { queries: "nope" } }),
    ).toBeUndefined();
  });

  it("preserves buster and timestamp so age/version checks still run", () => {
    const client = clientWith([
      { queryKey: familyKeys.family(), data: wrap(family) },
    ]);
    const restored = restorePersistedClient(client);
    expect(restored?.buster).toBe("test");
    expect(restored?.timestamp).toBe(client.timestamp);
  });
});

import { HttpResponse, http } from "msw";
import { formatLocalDate, parseLocalDate } from "@/lib/time-utils";
import type {
  AddMemberRequest,
  ApiResponse,
  CalendarEventResponse,
  ChoreBoardItem,
  ChoreScopeBoard,
  ChoresBoard,
  ChoreTemplate,
  CreateChoreTemplateRequest,
  CreateEventRequest,
  CreateRecipeRequest,
  DuplicateMealSlotRequest,
  FamilyData,
  FamilyMember,
  ListCategory,
  ListDetail,
  ListItem,
  ListKind,
  ListPreferences,
  LoginRequest,
  LoginResponse,
  MealBoard,
  MealCollisionMode,
  MealDay,
  MealEntryRequest,
  MealSlot,
  MealSlotEntry,
  MealType,
  MoveMealSlotRequest,
  RecipeDetail,
  RecipeSummary,
  RegisterRequest,
  RegisterResponse,
  RemoveMealSlotRequest,
  UpdateChoreTemplateRequest,
  UpdateCurrentPeriodCompletionRequest,
  UpdateEventRequest,
  UpdateFamilyRequest,
  UpdateMemberRequest,
  UpdateRecipeRequest,
  UpsertMealSlotRequest,
  UsernameCheckResponse,
} from "@/lib/types";

// In-memory storage for mock calendar events (reset between tests)
// Uses CalendarEventResponse (string dates) to match real API wire format
let mockEvents: CalendarEventResponse[] = [];

// In-memory storage for mock chores board (reset between tests)
let mockChoresBoard: ChoresBoard = createEmptyChoresBoard();

// In-memory storage for mock family data (reset between tests)
let mockFamily: FamilyData | null = null;

// In-memory storage for mock users (reset between tests)
interface MockUser {
  username: string;
  password: string;
  familyId: string;
}
let mockUsers: MockUser[] = [];

// In-memory storage for persisted family lists (reset between tests)
let mockLists: ListDetail[] = [];
let mockListPreferences: ListPreferences = { showCompletedByDefault: true };
let mockRecipes: RecipeDetail[] = [];
let mockMealsBoards: Record<string, MealBoard> = {};
let mockIdCounter = 1000;
let mockRecipeIdCounter = 1000;
let mockMealSlotIdCounter = 1000;
let mockMealEntryIdCounter = 1000;
const MOCK_TIMESTAMP = "2026-05-06T09:00:00";
const MOCK_RECIPE_TIMESTAMP = "2026-06-04T09:00:00";
const MOCK_IMPORTED_RECIPE: RecipeDetail = {
  id: "00000000-0000-4000-8000-000000000502",
  title: "Imported Tomato Soup",
  imageUrl: null,
  ingredients: ["Tomatoes", "Stock", "Cream"],
  instructions: ["Simmer tomatoes and stock", "Blend with cream"],
  note: null,
  sourceUrl: "https://example.com/imported-tomato-soup",
  tags: ["lunch", "quick"],
  favorite: false,
  updatedAt: MOCK_RECIPE_TIMESTAMP,
};

function createEmptyChoresBoard(): ChoresBoard {
  return {
    timezone: "America/Los_Angeles",
    today: {
      scope: "TODAY",
      periodStartDate: "2026-05-17",
      periodEndDate: "2026-05-17",
      summary: { total: 0, completed: 0, remaining: 0 },
      assignees: [],
    },
    thisWeek: {
      scope: "THIS_WEEK",
      periodStartDate: "2026-05-17",
      periodEndDate: "2026-05-23",
      summary: { total: 0, completed: 0, remaining: 0 },
      assignees: [],
    },
    thisMonth: {
      scope: "THIS_MONTH",
      periodStartDate: "2026-05-01",
      periodEndDate: "2026-05-31",
      summary: { total: 0, completed: 0, remaining: 0 },
      assignees: [],
    },
  };
}

const seededCategories: Record<Exclude<ListKind, "general">, ListCategory[]> = {
  grocery: [
    {
      id: "00000000-0000-4000-8000-000000000301",
      kind: "grocery",
      name: "Produce",
      seeded: true,
      sortOrder: 0,
    },
    {
      id: "00000000-0000-4000-8000-000000000302",
      kind: "grocery",
      name: "Dairy",
      seeded: true,
      sortOrder: 1,
    },
    {
      id: "00000000-0000-4000-8000-000000000303",
      kind: "grocery",
      name: "Pantry",
      seeded: true,
      sortOrder: 2,
    },
    {
      id: "00000000-0000-4000-8000-000000000304",
      kind: "grocery",
      name: "Frozen",
      seeded: true,
      sortOrder: 3,
    },
    {
      id: "00000000-0000-4000-8000-000000000305",
      kind: "grocery",
      name: "Household",
      seeded: true,
      sortOrder: 4,
    },
  ],
  "to-do": [
    {
      id: "00000000-0000-4000-8000-000000000401",
      kind: "to-do",
      name: "Urgent",
      seeded: true,
      sortOrder: 0,
    },
    {
      id: "00000000-0000-4000-8000-000000000402",
      kind: "to-do",
      name: "Soon",
      seeded: true,
      sortOrder: 1,
    },
    {
      id: "00000000-0000-4000-8000-000000000403",
      kind: "to-do",
      name: "Later",
      seeded: true,
      sortOrder: 2,
    },
  ],
};

/**
 * Reset mock data between tests
 */
export function resetMockEvents(): void {
  mockEvents = [];
}

/**
 * Seed mock events for testing.
 * Accepts CalendarEventResponse (string dates) to match real API wire format.
 */
export function seedMockEvents(events: CalendarEventResponse[]): void {
  mockEvents = [...events];
}

/**
 * Get current mock events (for assertions)
 */
export function getMockEvents(): CalendarEventResponse[] {
  return [...mockEvents];
}

/**
 * Reset mock chores board between tests.
 */
export function resetMockChoresBoard(): void {
  mockChoresBoard = createEmptyChoresBoard();
}

/**
 * Seed mock chores board for testing.
 */
export function seedMockChoresBoard(board: ChoresBoard): void {
  mockChoresBoard = structuredClone(board);
}

/**
 * Get current mock chores board for assertions.
 */
export function getMockChoresBoard(): ChoresBoard {
  return structuredClone(mockChoresBoard);
}

/**
 * Reset mock family data between tests
 */
export function resetMockFamily(): void {
  mockFamily = null;
}

/**
 * Reset mock users between tests
 */
export function resetMockUsers(): void {
  mockUsers = [];
}

/**
 * Seed mock family for testing
 */
export function seedMockFamily(family: FamilyData | null): void {
  mockFamily = family;
}

/**
 * Get current mock family (for assertions)
 */
export function getMockFamily(): FamilyData | null {
  return mockFamily;
}

/**
 * Reset mock list data between tests.
 */
export function resetMockLists(): void {
  mockLists = [];
  mockListPreferences = { showCompletedByDefault: true };
  mockIdCounter = 1000;
}

/**
 * Seed mock list details for testing.
 */
export function seedMockLists(lists: ListDetail[]): void {
  mockLists = lists.map((list) => ({ ...list, items: [...list.items] }));
}

/**
 * Seed mock list preferences for testing.
 */
export function seedMockListPreferences(preferences: ListPreferences): void {
  mockListPreferences = preferences;
}

/**
 * Reset mock recipe data between tests.
 */
export function resetMockRecipes(): void {
  mockRecipes = [];
  mockRecipeIdCounter = 1000;
}

/**
 * Seed mock recipe details for testing.
 */
export function seedMockRecipes(recipes: RecipeDetail[]): void {
  mockRecipes = recipes.map((recipe) => structuredClone(recipe));
}

/**
 * Reset mock meals data between tests.
 */
export function resetMockMeals(): void {
  mockMealsBoards = {};
  mockMealSlotIdCounter = 1000;
  mockMealEntryIdCounter = 1000;
}

/**
 * Seed one mock meals board for testing.
 */
export function seedMockMealsBoard(board: MealBoard): void {
  mockMealsBoards[board.weekStartDate] = structuredClone(board);
}

/**
 * Read one mock meals board for assertions.
 */
export function getMockMealsBoard(weekStartDate: string): MealBoard {
  return structuredClone(getMealsBoard(weekStartDate));
}

function createMockId(): string {
  mockIdCounter += 1;
  return `00000000-0000-4000-8000-${String(mockIdCounter).padStart(12, "0")}`;
}

function createMockRecipeId(): string {
  mockRecipeIdCounter += 1;
  return `00000000-0000-4000-8000-${String(mockRecipeIdCounter).padStart(12, "0")}`;
}

function createMockMealSlotId(): string {
  mockMealSlotIdCounter += 1;
  return `00000000-0000-4000-8000-${String(mockMealSlotIdCounter).padStart(12, "0")}`;
}

function createMockMealEntryId(): string {
  mockMealEntryIdCounter += 1;
  return `00000000-0000-4000-8000-${String(mockMealEntryIdCounter).padStart(12, "0")}`;
}

function isPrivateIpv4(hostname: string): boolean {
  const parts = hostname.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) {
    return false;
  }

  const [first, second] = parts;
  return (
    first === 10 ||
    first === 127 ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  );
}

function isBlockedRecipeImportUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const protocolAllowed =
      url.protocol === "http:" || url.protocol === "https:";
    if (!protocolAllowed) return true;

    const hostname = url.hostname.toLowerCase();
    return (
      hostname === "localhost" ||
      hostname === "::1" ||
      hostname.endsWith(".localhost") ||
      isPrivateIpv4(hostname)
    );
  } catch {
    return true;
  }
}

function categoriesForKind(kind: ListKind): ListCategory[] {
  return kind === "general" ? [] : seededCategories[kind];
}

function recalculateScopeSummary(scope: ChoreScopeBoard): ChoreScopeBoard {
  const assignees = scope.assignees.map((group) => {
    const completed = group.chores.filter((chore) => chore.completed).length;
    const total = group.chores.length;

    return {
      ...group,
      summary: {
        total,
        completed,
        remaining: total - completed,
      },
    };
  });
  const total = assignees.reduce((sum, group) => sum + group.summary.total, 0);
  const completed = assignees.reduce(
    (sum, group) => sum + group.summary.completed,
    0,
  );

  return {
    ...scope,
    assignees,
    summary: {
      total,
      completed,
      remaining: total - completed,
    },
  };
}

function updateBoardItem(
  templateId: string,
  update: (item: ChoreBoardItem) => ChoreBoardItem,
): ChoreBoardItem | null {
  let updatedItem: ChoreBoardItem | null = null;

  mockChoresBoard = {
    ...mockChoresBoard,
    today: recalculateScopeSummary({
      ...mockChoresBoard.today,
      assignees: mockChoresBoard.today.assignees.map((group) => ({
        ...group,
        chores: group.chores.map((item) => {
          if (item.templateId !== templateId) {
            return item;
          }
          updatedItem = update(item);
          return updatedItem;
        }),
      })),
    }),
    thisWeek: recalculateScopeSummary({
      ...mockChoresBoard.thisWeek,
      assignees: mockChoresBoard.thisWeek.assignees.map((group) => ({
        ...group,
        chores: group.chores.map((item) => {
          if (item.templateId !== templateId) {
            return item;
          }
          updatedItem = update(item);
          return updatedItem;
        }),
      })),
    }),
    thisMonth: recalculateScopeSummary({
      ...mockChoresBoard.thisMonth,
      assignees: mockChoresBoard.thisMonth.assignees.map((group) => ({
        ...group,
        chores: group.chores.map((item) => {
          if (item.templateId !== templateId) {
            return item;
          }
          updatedItem = update(item);
          return updatedItem;
        }),
      })),
    }),
  };

  return updatedItem;
}

function removeBoardItem(templateId: string): void {
  mockChoresBoard = {
    ...mockChoresBoard,
    today: recalculateScopeSummary({
      ...mockChoresBoard.today,
      assignees: mockChoresBoard.today.assignees.map((group) => ({
        ...group,
        chores: group.chores.filter((item) => item.templateId !== templateId),
      })),
    }),
    thisWeek: recalculateScopeSummary({
      ...mockChoresBoard.thisWeek,
      assignees: mockChoresBoard.thisWeek.assignees.map((group) => ({
        ...group,
        chores: group.chores.filter((item) => item.templateId !== templateId),
      })),
    }),
    thisMonth: recalculateScopeSummary({
      ...mockChoresBoard.thisMonth,
      assignees: mockChoresBoard.thisMonth.assignees.map((group) => ({
        ...group,
        chores: group.chores.filter((item) => item.templateId !== templateId),
      })),
    }),
  };
}

function toListSummary(list: ListDetail) {
  return {
    id: list.id,
    name: list.name,
    kind: list.kind,
    totalItems: list.items.length,
    completedItems: list.items.filter((item) => item.completed).length,
  };
}

function toRecipeSummary(recipe: RecipeDetail): RecipeSummary {
  return {
    id: recipe.id,
    title: recipe.title,
    imageUrl: recipe.imageUrl,
    favorite: recipe.favorite,
    tags: recipe.tags,
    updatedAt: recipe.updatedAt,
  };
}

const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner"];

function createEmptyMealSlot(
  weekStartDate: string,
  dayIndex: number,
  mealType: MealType,
): MealSlot {
  return {
    id: null,
    weekStartDate,
    dayIndex,
    mealType,
    primary: null,
    extras: [],
    note: null,
  };
}

function createEmptyMealDay(weekStartDate: string, dayIndex: number): MealDay {
  const date = parseLocalDate(weekStartDate);
  date.setDate(date.getDate() + dayIndex);

  return {
    date: formatLocalDate(date),
    dayIndex,
    slots: MEAL_TYPES.map((mealType) =>
      createEmptyMealSlot(weekStartDate, dayIndex, mealType),
    ),
  };
}

function createEmptyMealsBoard(weekStartDate: string): MealBoard {
  return {
    weekStartDate,
    days: Array.from({ length: 7 }, (_, dayIndex) =>
      createEmptyMealDay(weekStartDate, dayIndex),
    ),
  };
}

function getMealsBoard(weekStartDate: string): MealBoard {
  if (!mockMealsBoards[weekStartDate]) {
    mockMealsBoards[weekStartDate] = createEmptyMealsBoard(weekStartDate);
  }

  return mockMealsBoards[weekStartDate];
}

function findMealSlot(
  board: MealBoard,
  dayIndex: number,
  mealType: MealType,
): MealSlot {
  const day = board.days[dayIndex];
  if (!day) {
    throw new Error(
      `No day at index ${dayIndex} in board ${board.weekStartDate}`,
    );
  }
  const slot = day.slots.find((s) => s.mealType === mealType);
  if (!slot) {
    throw new Error(
      `No ${mealType} slot on day ${dayIndex} in board ${board.weekStartDate}`,
    );
  }
  return slot;
}

function setMealSlot(board: MealBoard, updatedSlot: MealSlot): void {
  const day = board.days[updatedSlot.dayIndex];
  day.slots = day.slots.map((slot) =>
    slot.mealType === updatedSlot.mealType ? updatedSlot : slot,
  );
}

function cloneMealEntry(entry: MealSlotEntry, role: MealSlotEntry["role"]) {
  return {
    ...structuredClone(entry),
    id: createMockMealEntryId(),
    role,
  };
}

function snapshotMealEntry(
  request: MealEntryRequest,
  role: MealSlotEntry["role"],
): MealSlotEntry | HttpResponse {
  if (request.sourceType === "recipe") {
    const recipe = mockRecipes.find(
      (candidate) => candidate.id === request.recipeId,
    );
    if (!recipe) {
      return HttpResponse.json(
        { message: `Recipe with id "${request.recipeId}" not found` },
        { status: 404 },
      );
    }

    return {
      id: createMockMealEntryId(),
      role,
      sourceType: "recipe",
      recipeId: recipe.id,
      title: recipe.title,
      imageUrl: recipe.imageUrl,
      note: recipe.note,
    };
  }

  const title = request.title?.trim() ?? "";
  if (!title) {
    return HttpResponse.json(
      { message: "Quick meal title is required" },
      { status: 400 },
    );
  }

  return {
    id: createMockMealEntryId(),
    role,
    sourceType: "quick",
    recipeId: null,
    title,
    imageUrl: request.imageUrl ?? null,
    note: request.note ?? null,
  };
}

function clearMealSlot(slot: MealSlot): MealSlot {
  return {
    ...slot,
    primary: null,
    extras: [],
    note: null,
  };
}

function resolveMealSlotPlacement(
  slot: MealSlot,
  primary: MealSlotEntry,
  extras: MealSlotEntry[],
  note: string | null,
  collisionMode: MealCollisionMode | null,
): MealSlot | HttpResponse {
  const id = slot.id ?? createMockMealSlotId();

  if (slot.primary && collisionMode === null) {
    return HttpResponse.json(
      { message: "Meal slot already has a primary meal" },
      { status: 409 },
    );
  }

  if (slot.primary && collisionMode === "add_as_extra") {
    return {
      ...slot,
      id,
      extras: [...slot.extras, { ...primary, role: "extra" }, ...extras],
      note,
    };
  }

  return {
    ...slot,
    id,
    primary: { ...primary, role: "primary" },
    extras,
    note,
  };
}

function snapshotRequestedEntries(
  primaryRequest: MealEntryRequest,
  extraRequests: MealEntryRequest[] = [],
): { primary: MealSlotEntry; extras: MealSlotEntry[] } | HttpResponse {
  const primary = snapshotMealEntry(primaryRequest, "primary");
  if (primary instanceof HttpResponse) return primary;

  const extras: MealSlotEntry[] = [];
  for (const extraRequest of extraRequests) {
    const extra = snapshotMealEntry(extraRequest, "extra");
    if (extra instanceof HttpResponse) return extra;
    extras.push(extra);
  }

  return { primary, extras };
}

function createApiResponse<T>(data: T, message?: string): ApiResponse<T> {
  return message ? { data, message } : { data };
}

// Base URL for API endpoints — must match vitest.config.ts VITE_API_BASE_URL
export const API_BASE = "http://localhost:3000/api";

/**
 * MSW request handlers for calendar API endpoints.
 *
 * Usage in tests:
 * ```typescript
 * import { server, seedMockEvents, resetMockEvents } from "@/test/mocks/server";
 *
 * beforeEach(() => {
 *   seedMockEvents([testEvent]);
 * });
 *
 * afterEach(() => {
 *   resetMockEvents();
 * });
 * ```
 *
 * Override handlers for error scenarios:
 * ```typescript
 * server.use(
 *   http.get("http://localhost:3000/api/calendar/events", () => {
 *     return HttpResponse.json({ message: "Server error" }, { status: 500 });
 *   })
 * );
 * ```
 */
export const handlers = [
  // ============================================================================
  // Meals API Handlers
  // ============================================================================

  // GET /meals/board - Week board
  http.get(`${API_BASE}/meals/board`, ({ request }) => {
    const url = new URL(request.url);
    const weekStartDate = url.searchParams.get("weekStartDate");
    if (!weekStartDate) {
      return HttpResponse.json(
        { message: "weekStartDate is required" },
        { status: 400 },
      );
    }

    return HttpResponse.json(createApiResponse(getMealsBoard(weekStartDate)));
  }),

  // PUT /meals/slots - Create or update one slot
  http.put(`${API_BASE}/meals/slots`, async ({ request }) => {
    const body = (await request.json()) as UpsertMealSlotRequest;
    const board = getMealsBoard(body.weekStartDate);
    const slot = findMealSlot(board, body.dayIndex, body.mealType);
    const entries = snapshotRequestedEntries(body.primary, body.extras);
    if (entries instanceof HttpResponse) return entries;

    const updatedSlot = resolveMealSlotPlacement(
      slot,
      entries.primary,
      entries.extras,
      body.note ?? null,
      body.collisionMode,
    );
    if (updatedSlot instanceof HttpResponse) return updatedSlot;

    setMealSlot(board, updatedSlot);

    return HttpResponse.json(
      createApiResponse(updatedSlot, "Meal slot updated successfully"),
    );
  }),

  // POST /meals/slots/move - Move a planned meal block
  http.post(`${API_BASE}/meals/slots/move`, async ({ request }) => {
    const body = (await request.json()) as MoveMealSlotRequest;
    const sourceBoard = getMealsBoard(body.sourceWeekStartDate);
    const destinationBoard = getMealsBoard(body.destinationWeekStartDate);
    const sourceSlot = findMealSlot(
      sourceBoard,
      body.sourceDayIndex,
      body.sourceMealType,
    );
    const destinationSlot = findMealSlot(
      destinationBoard,
      body.destinationDayIndex,
      body.destinationMealType,
    );

    if (!sourceSlot.primary) {
      return HttpResponse.json(
        { message: "Source meal slot is empty" },
        { status: 404 },
      );
    }

    const updatedDestination = resolveMealSlotPlacement(
      destinationSlot,
      cloneMealEntry(sourceSlot.primary, "primary"),
      sourceSlot.extras.map((extra) => cloneMealEntry(extra, "extra")),
      sourceSlot.note,
      body.collisionMode,
    );
    if (updatedDestination instanceof HttpResponse) return updatedDestination;

    setMealSlot(destinationBoard, updatedDestination);
    setMealSlot(sourceBoard, clearMealSlot(sourceSlot));

    return HttpResponse.json(
      createApiResponse(destinationBoard, "Meal slot moved successfully"),
    );
  }),

  // POST /meals/slots/duplicate - Duplicate a planned meal block
  http.post(`${API_BASE}/meals/slots/duplicate`, async ({ request }) => {
    const body = (await request.json()) as DuplicateMealSlotRequest;
    const sourceBoard = getMealsBoard(body.sourceWeekStartDate);
    const destinationBoard = getMealsBoard(body.destinationWeekStartDate);
    const sourceSlot = findMealSlot(
      sourceBoard,
      body.sourceDayIndex,
      body.sourceMealType,
    );
    const destinationSlot = findMealSlot(
      destinationBoard,
      body.destinationDayIndex,
      body.destinationMealType,
    );

    if (!sourceSlot.primary) {
      return HttpResponse.json(
        { message: "Source meal slot is empty" },
        { status: 404 },
      );
    }

    const updatedDestination = resolveMealSlotPlacement(
      destinationSlot,
      cloneMealEntry(sourceSlot.primary, "primary"),
      sourceSlot.extras.map((extra) => cloneMealEntry(extra, "extra")),
      sourceSlot.note,
      body.collisionMode,
    );
    if (updatedDestination instanceof HttpResponse) return updatedDestination;

    setMealSlot(destinationBoard, updatedDestination);

    return HttpResponse.json(
      createApiResponse(destinationBoard, "Meal slot duplicated successfully"),
    );
  }),

  // DELETE /meals/slots - Remove one planned slot.
  // Mirrors the released backend: the payload is a validated @RequestBody, not
  // query parameters. An absent or malformed body is a 400, exactly as
  // production rejects it.
  http.delete(`${API_BASE}/meals/slots`, async ({ request }) => {
    let body: Partial<RemoveMealSlotRequest> | null = null;
    try {
      body = (await request.json()) as RemoveMealSlotRequest;
    } catch {
      body = null;
    }

    const weekStartDate = body?.weekStartDate;
    const dayIndex = body?.dayIndex;
    const mealType = body?.mealType;

    if (
      !weekStartDate ||
      dayIndex === undefined ||
      dayIndex === null ||
      !mealType
    ) {
      return HttpResponse.json(
        { message: "weekStartDate, dayIndex, and mealType are required" },
        { status: 400 },
      );
    }

    const board = getMealsBoard(weekStartDate);
    const slot = findMealSlot(board, dayIndex, mealType);
    setMealSlot(board, clearMealSlot(slot));

    return HttpResponse.json(
      createApiResponse(board, "Meal slot removed successfully"),
    );
  }),

  // ============================================================================
  // Recipes API Handlers
  // ============================================================================

  // GET /recipes - Library summaries
  http.get(`${API_BASE}/recipes`, () => {
    return HttpResponse.json(
      createApiResponse(mockRecipes.map(toRecipeSummary)),
    );
  }),

  // GET /recipes/:id - Detail payload
  http.get(`${API_BASE}/recipes/:id`, ({ params }) => {
    const recipe = mockRecipes.find((candidate) => candidate.id === params.id);
    if (!recipe) {
      return HttpResponse.json(
        { message: `Recipe with id "${params.id}" not found` },
        { status: 404 },
      );
    }

    return HttpResponse.json(createApiResponse(recipe));
  }),

  // POST /recipes - Create a saved recipe
  http.post(`${API_BASE}/recipes`, async ({ request }) => {
    const body = (await request.json()) as CreateRecipeRequest;
    const recipe: RecipeDetail = {
      id: createMockRecipeId(),
      title: body.title.trim(),
      imageUrl: body.imageUrl ?? null,
      ingredients: body.ingredients ?? [],
      instructions: body.instructions ?? [],
      note: body.note ?? null,
      sourceUrl: body.sourceUrl ?? null,
      tags: body.tags ?? [],
      favorite: body.favorite ?? false,
      updatedAt: MOCK_RECIPE_TIMESTAMP,
    };

    mockRecipes = [recipe, ...mockRecipes];

    return HttpResponse.json(
      createApiResponse(recipe, "Recipe created successfully"),
      { status: 201 },
    );
  }),

  // PATCH /recipes/:id - Update a saved recipe
  http.patch(`${API_BASE}/recipes/:id`, async ({ params, request }) => {
    const index = mockRecipes.findIndex(
      (candidate) => candidate.id === params.id,
    );
    if (index === -1) {
      return HttpResponse.json(
        { message: `Recipe with id "${params.id}" not found` },
        { status: 404 },
      );
    }

    const body = (await request.json()) as UpdateRecipeRequest;
    const current = mockRecipes[index];
    const updated: RecipeDetail = {
      ...current,
      ...body,
      title: body.title?.trim() ?? current.title,
      imageUrl: body.imageUrl === undefined ? current.imageUrl : body.imageUrl,
      ingredients: body.ingredients ?? current.ingredients,
      instructions: body.instructions ?? current.instructions,
      note: body.note === undefined ? current.note : body.note,
      sourceUrl:
        body.sourceUrl === undefined ? current.sourceUrl : body.sourceUrl,
      tags: body.tags ?? current.tags,
      favorite: body.favorite ?? current.favorite,
      updatedAt: MOCK_RECIPE_TIMESTAMP,
    };

    mockRecipes = [
      ...mockRecipes.slice(0, index),
      updated,
      ...mockRecipes.slice(index + 1),
    ];

    return HttpResponse.json(
      createApiResponse(updated, "Recipe updated successfully"),
    );
  }),

  // POST /recipes/import - Import from URL and persist
  http.post(`${API_BASE}/recipes/import`, async ({ request }) => {
    const body = (await request.json()) as { url: string };
    if (
      body.url === "https://example.com/import-error" ||
      isBlockedRecipeImportUrl(body.url)
    ) {
      return HttpResponse.json(
        { message: "Could not import recipe" },
        { status: 400 },
      );
    }

    const imported: RecipeDetail = {
      ...MOCK_IMPORTED_RECIPE,
      id: mockRecipes.some((recipe) => recipe.id === MOCK_IMPORTED_RECIPE.id)
        ? createMockRecipeId()
        : MOCK_IMPORTED_RECIPE.id,
      sourceUrl: body.url,
    };

    mockRecipes = [imported, ...mockRecipes];

    return HttpResponse.json(
      createApiResponse(imported, "Recipe imported successfully"),
      { status: 201 },
    );
  }),

  // ============================================================================
  // Lists API Handlers
  // ============================================================================

  // GET /lists/preferences - Family-wide completed item visibility default
  http.get(`${API_BASE}/lists/preferences`, () => {
    return HttpResponse.json(createApiResponse(mockListPreferences));
  }),

  // PATCH /lists/preferences - Update family-wide completed visibility default
  http.patch(`${API_BASE}/lists/preferences`, async ({ request }) => {
    const body = (await request.json()) as ListPreferences;
    mockListPreferences = {
      showCompletedByDefault: body.showCompletedByDefault,
    };

    return HttpResponse.json(
      createApiResponse(
        mockListPreferences,
        "List preferences updated successfully",
      ),
    );
  }),

  // GET /lists - Hub summaries
  http.get(`${API_BASE}/lists`, () => {
    return HttpResponse.json(createApiResponse(mockLists.map(toListSummary)));
  }),

  // POST /lists - Create a family-owned list
  http.post(`${API_BASE}/lists`, async ({ request }) => {
    const body = (await request.json()) as {
      name: string;
      kind: ListKind;
    };
    const categories = categoriesForKind(body.kind);
    const newList: ListDetail = {
      id: createMockId(),
      name: body.name.trim(),
      kind: body.kind,
      categoryDisplayMode: body.kind === "general" ? "flat" : "grouped",
      showCompletedOverride: null,
      categories,
      items: [],
      createdAt: MOCK_TIMESTAMP,
      updatedAt: MOCK_TIMESTAMP,
    };

    mockLists = [newList, ...mockLists];

    return HttpResponse.json(
      createApiResponse(newList, "List created successfully"),
      { status: 201 },
    );
  }),

  // GET /lists/:id - Detail payload
  http.get(`${API_BASE}/lists/:id`, ({ params }) => {
    const list = mockLists.find((candidate) => candidate.id === params.id);
    if (!list) {
      return HttpResponse.json(
        { message: `List with id "${params.id}" not found` },
        { status: 404 },
      );
    }

    return HttpResponse.json(createApiResponse(list));
  }),

  // PATCH /lists/:id - Update category display mode and completed override
  http.patch(`${API_BASE}/lists/:id`, async ({ params, request }) => {
    const index = mockLists.findIndex(
      (candidate) => candidate.id === params.id,
    );
    if (index === -1) {
      return HttpResponse.json(
        { message: `List with id "${params.id}" not found` },
        { status: 404 },
      );
    }

    const body = (await request.json()) as {
      categoryDisplayMode: "grouped" | "flat";
      showCompletedOverride: boolean | null;
    };
    const existing = mockLists[index];

    if (existing.kind === "general" && body.categoryDisplayMode === "grouped") {
      return HttpResponse.json(
        { message: "General lists cannot use grouped category mode." },
        { status: 400 },
      );
    }

    const updated: ListDetail = {
      ...existing,
      categoryDisplayMode: body.categoryDisplayMode,
      showCompletedOverride: body.showCompletedOverride,
      updatedAt: MOCK_TIMESTAMP,
    };

    mockLists = [
      ...mockLists.slice(0, index),
      updated,
      ...mockLists.slice(index + 1),
    ];

    return HttpResponse.json(
      createApiResponse(updated, "List updated successfully"),
    );
  }),

  // POST /lists/:id/items - Create an item
  http.post(`${API_BASE}/lists/:id/items`, async ({ params, request }) => {
    const index = mockLists.findIndex(
      (candidate) => candidate.id === params.id,
    );
    if (index === -1) {
      return HttpResponse.json(
        { message: `List with id "${params.id}" not found` },
        { status: 404 },
      );
    }

    const body = (await request.json()) as {
      text: string;
      categoryId?: string | null;
    };
    const list = mockLists[index];
    const item: ListItem = {
      id: createMockId(),
      text: body.text.trim(),
      completed: false,
      completedAt: null,
      categoryId: body.categoryId ?? null,
      createdAt: MOCK_TIMESTAMP,
      updatedAt: MOCK_TIMESTAMP,
    };
    const updated: ListDetail = {
      ...list,
      items: [...list.items, item],
      updatedAt: MOCK_TIMESTAMP,
    };

    mockLists = [
      ...mockLists.slice(0, index),
      updated,
      ...mockLists.slice(index + 1),
    ];

    return HttpResponse.json(
      createApiResponse(item, "List item created successfully"),
      { status: 201 },
    );
  }),

  // PATCH /lists/:listId/items/:itemId - Update text/category/completed state
  http.patch(
    `${API_BASE}/lists/:listId/items/:itemId`,
    async ({ params, request }) => {
      const listIndex = mockLists.findIndex(
        (candidate) => candidate.id === params.listId,
      );
      if (listIndex === -1) {
        return HttpResponse.json(
          { message: `List with id "${params.listId}" not found` },
          { status: 404 },
        );
      }

      const list = mockLists[listIndex];
      const itemIndex = list.items.findIndex(
        (candidate) => candidate.id === params.itemId,
      );
      if (itemIndex === -1) {
        return HttpResponse.json(
          { message: `List item with id "${params.itemId}" not found` },
          { status: 404 },
        );
      }

      const body = (await request.json()) as {
        text: string;
        completed: boolean;
        categoryId?: string | null;
      };
      const existing = list.items[itemIndex];
      const updatedItem: ListItem = {
        ...existing,
        text: body.text.trim(),
        completed: body.completed,
        completedAt: body.completed
          ? (existing.completedAt ?? MOCK_TIMESTAMP)
          : null,
        categoryId: body.categoryId ?? null,
        updatedAt: MOCK_TIMESTAMP,
      };
      const updatedList: ListDetail = {
        ...list,
        items: [
          ...list.items.slice(0, itemIndex),
          updatedItem,
          ...list.items.slice(itemIndex + 1),
        ],
        updatedAt: MOCK_TIMESTAMP,
      };

      mockLists = [
        ...mockLists.slice(0, listIndex),
        updatedList,
        ...mockLists.slice(listIndex + 1),
      ];

      return HttpResponse.json(
        createApiResponse(updatedItem, "List item updated successfully"),
      );
    },
  ),

  // DELETE /lists/:listId/items/:itemId - Delete an item
  http.delete(`${API_BASE}/lists/:listId/items/:itemId`, ({ params }) => {
    const listIndex = mockLists.findIndex(
      (candidate) => candidate.id === params.listId,
    );
    if (listIndex === -1) {
      return HttpResponse.json(
        { message: `List with id "${params.listId}" not found` },
        { status: 404 },
      );
    }

    const list = mockLists[listIndex];
    const updatedList: ListDetail = {
      ...list,
      items: list.items.filter((item) => item.id !== params.itemId),
      updatedAt: MOCK_TIMESTAMP,
    };

    mockLists = [
      ...mockLists.slice(0, listIndex),
      updatedList,
      ...mockLists.slice(listIndex + 1),
    ];

    return new HttpResponse(null, { status: 204 });
  }),

  // POST /lists/:id/clear-completed - Remove completed items in bulk
  http.post(`${API_BASE}/lists/:id/clear-completed`, ({ params }) => {
    const index = mockLists.findIndex(
      (candidate) => candidate.id === params.id,
    );
    if (index === -1) {
      return HttpResponse.json(
        { message: `List with id "${params.id}" not found` },
        { status: 404 },
      );
    }

    const list = mockLists[index];
    const activeItems = list.items.filter((item) => !item.completed);
    const updated: ListDetail = {
      ...list,
      items: activeItems,
      updatedAt: MOCK_TIMESTAMP,
    };

    mockLists = [
      ...mockLists.slice(0, index),
      updated,
      ...mockLists.slice(index + 1),
    ];

    return HttpResponse.json(
      createApiResponse(
        { removedCount: list.items.length - activeItems.length },
        "Completed items removed successfully",
      ),
    );
  }),

  // ============================================================================
  // Calendar API Handlers
  // ============================================================================

  // GET /calendar/events - List events with optional filters
  http.get(`${API_BASE}/calendar/events`, ({ request }) => {
    const url = new URL(request.url);
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");
    const memberId = url.searchParams.get("memberId");

    let events = [...mockEvents];

    // Apply date range overlap filtering to match the real backend.
    // Multi-day all-day events should be returned when any part of the
    // event overlaps the requested range, not only when the start date
    // falls inside the range.
    if (startDate || endDate) {
      const rangeStart = startDate ? parseLocalDate(startDate) : null;
      const rangeEnd = endDate ? parseLocalDate(endDate) : null;

      events = events.filter((event) => {
        const eventStart = parseLocalDate(event.date);
        const eventEnd = event.endDate
          ? parseLocalDate(event.endDate)
          : eventStart;

        if (rangeStart && eventEnd < rangeStart) {
          return false;
        }

        if (rangeEnd && eventStart > rangeEnd) {
          return false;
        }

        return true;
      });
    }

    // Apply member filter
    if (memberId) {
      events = events.filter((e) => e.memberId === memberId);
    }

    return HttpResponse.json(createApiResponse(events));
  }),

  // GET /calendar/events/:id - Get single event
  http.get(`${API_BASE}/calendar/events/:id`, ({ params }) => {
    const { id } = params;
    const event = mockEvents.find((e) => e.id === id);

    if (!event) {
      return HttpResponse.json(
        { message: `Event with id "${id}" not found` },
        { status: 404 },
      );
    }

    return HttpResponse.json(createApiResponse(event));
  }),

  // POST /calendar/events - Create new event
  http.post(`${API_BASE}/calendar/events`, async ({ request }) => {
    const body = (await request.json()) as CreateEventRequest;

    const newEvent: CalendarEventResponse = {
      id: `event-${Date.now()}`,
      title: body.title,
      startTime: body.startTime,
      endTime: body.endTime,
      date: body.date,
      memberId: body.memberId,
      isAllDay: body.isAllDay,
      location: body.location,
    };

    mockEvents = [...mockEvents, newEvent];

    return HttpResponse.json(
      createApiResponse(newEvent, "Event created successfully"),
    );
  }),

  // PUT /calendar/events/:id - Update event (full replacement)
  http.put(`${API_BASE}/calendar/events/:id`, async ({ params, request }) => {
    const { id } = params;
    const body = (await request.json()) as UpdateEventRequest;

    const index = mockEvents.findIndex((e) => e.id === id);
    if (index === -1) {
      return HttpResponse.json(
        { message: `Event with id "${id}" not found` },
        { status: 404 },
      );
    }

    const updatedEvent: CalendarEventResponse = {
      id: id as string,
      title: body.title,
      startTime: body.startTime,
      endTime: body.endTime,
      date: body.date,
      memberId: body.memberId,
      isAllDay: body.isAllDay,
      location: body.location,
    };

    mockEvents = [
      ...mockEvents.slice(0, index),
      updatedEvent,
      ...mockEvents.slice(index + 1),
    ];

    return HttpResponse.json(
      createApiResponse(updatedEvent, "Event updated successfully"),
    );
  }),

  // DELETE /calendar/events/:id - Delete event
  http.delete(`${API_BASE}/calendar/events/:id`, ({ params }) => {
    const { id } = params;

    const index = mockEvents.findIndex((e) => e.id === id);
    if (index === -1) {
      return HttpResponse.json(
        { message: `Event with id "${id}" not found` },
        { status: 404 },
      );
    }

    mockEvents = mockEvents.filter((e) => e.id !== id);

    return new HttpResponse(null, { status: 204 });
  }),

  // ============================================================================
  // Chores API Handlers
  // ============================================================================

  // GET /chores/board - Present-focused recurring routines board
  http.get(`${API_BASE}/chores/board`, () => {
    return HttpResponse.json(createApiResponse(mockChoresBoard));
  }),

  // POST /chores/templates - Create recurring template
  http.post(`${API_BASE}/chores/templates`, async ({ request }) => {
    const body = (await request.json()) as CreateChoreTemplateRequest;
    const now = "2026-05-17T09:00:00Z";
    const template: ChoreTemplate = {
      id: `template-${mockIdCounter + 1}`,
      title: body.title,
      assignedToMemberId: body.assignedToMemberId,
      cadence: body.cadence,
      activeFrom: body.activeFrom,
      archived: false,
      createdAt: now,
      updatedAt: now,
    };

    return HttpResponse.json(
      createApiResponse(template, "Chore template created successfully"),
      { status: 201 },
    );
  }),

  // PATCH /chores/templates/:id - Update or archive recurring template
  http.patch(
    `${API_BASE}/chores/templates/:id`,
    async ({ params, request }) => {
      const { id } = params;
      const body = (await request.json()) as UpdateChoreTemplateRequest;

      if (body.archived) {
        removeBoardItem(id as string);
      }

      const template: ChoreTemplate = {
        id: id as string,
        title: body.title ?? "Updated chore",
        assignedToMemberId: body.assignedToMemberId ?? "member-1",
        cadence: body.cadence ?? "DAILY",
        activeFrom: body.activeFrom ?? "2026-05-17",
        archived: body.archived ?? false,
        createdAt: "2026-05-17T08:00:00Z",
        updatedAt: "2026-05-17T09:00:00Z",
      };

      return HttpResponse.json(
        createApiResponse(template, "Chore template updated successfully"),
      );
    },
  ),

  // PUT /chores/templates/:id/current-period-completion
  http.put(
    `${API_BASE}/chores/templates/:id/current-period-completion`,
    async ({ params, request }) => {
      const { id } = params;
      const body =
        (await request.json()) as UpdateCurrentPeriodCompletionRequest;
      const scope =
        body.scope === "TODAY"
          ? mockChoresBoard.today
          : body.scope === "THIS_WEEK"
            ? mockChoresBoard.thisWeek
            : mockChoresBoard.thisMonth;
      const item = updateBoardItem(id as string, (existing) => ({
        ...existing,
        completed: true,
        completedAt: "2026-05-17T09:30:00Z",
      }));

      if (!item) {
        return HttpResponse.json(
          { message: `Chore template with id "${id}" not found` },
          { status: 404 },
        );
      }

      return HttpResponse.json(
        createApiResponse({
          scope: body.scope,
          periodStartDate: body.periodStartDate,
          periodEndDate: scope.periodEndDate,
          item,
        }),
      );
    },
  ),

  // DELETE /chores/templates/:id/current-period-completion
  http.delete(
    `${API_BASE}/chores/templates/:id/current-period-completion`,
    async ({ params, request }) => {
      const { id } = params;
      const body =
        (await request.json()) as UpdateCurrentPeriodCompletionRequest;
      const scope =
        body.scope === "TODAY"
          ? mockChoresBoard.today
          : body.scope === "THIS_WEEK"
            ? mockChoresBoard.thisWeek
            : mockChoresBoard.thisMonth;
      const item = updateBoardItem(id as string, (existing) => ({
        ...existing,
        completed: false,
        completedAt: null,
      }));

      if (!item) {
        return HttpResponse.json(
          { message: `Chore template with id "${id}" not found` },
          { status: 404 },
        );
      }

      return HttpResponse.json(
        createApiResponse({
          scope: body.scope,
          periodStartDate: body.periodStartDate,
          periodEndDate: scope.periodEndDate,
          item,
        }),
      );
    },
  ),

  // ============================================================================
  // Family API Handlers
  // ============================================================================

  // GET /family - Get family data
  http.get(`${API_BASE}/family`, () => {
    return HttpResponse.json(createApiResponse(mockFamily));
  }),

  // PUT /family - Update family
  http.put(`${API_BASE}/family`, async ({ request }) => {
    if (!mockFamily) {
      return HttpResponse.json(
        { message: "No family exists" },
        { status: 404 },
      );
    }

    // Mirrors BE FamilyService (v1.6.0): fields left undefined are unchanged.
    const body = (await request.json()) as UpdateFamilyRequest;
    mockFamily = {
      ...mockFamily,
      ...(body.name !== undefined && { name: body.name }),
      ...(body.timezone !== undefined && { timezone: body.timezone }),
    };

    return HttpResponse.json(
      createApiResponse(mockFamily, "Family updated successfully"),
    );
  }),

  // DELETE /family - Delete family
  http.delete(`${API_BASE}/family`, () => {
    mockFamily = null;
    return new HttpResponse(null, { status: 204 });
  }),

  // POST /family/members - Add member
  http.post(`${API_BASE}/family/members`, async ({ request }) => {
    if (!mockFamily) {
      return HttpResponse.json(
        { message: "No family exists" },
        { status: 404 },
      );
    }

    const body = (await request.json()) as AddMemberRequest;
    const newMember: FamilyMember = {
      id: `member-${Date.now()}`,
      name: body.name,
      color: body.color,
      avatarUrl: body.avatarUrl,
      email: body.email,
    };

    mockFamily = {
      ...mockFamily,
      members: [...mockFamily.members, newMember],
    };

    return HttpResponse.json(
      createApiResponse(newMember, "Member added successfully"),
    );
  }),

  // PUT /family/members/:id - Update member
  http.put(`${API_BASE}/family/members/:id`, async ({ params, request }) => {
    if (!mockFamily) {
      return HttpResponse.json(
        { message: "No family exists" },
        { status: 404 },
      );
    }

    const { id } = params;
    const body = (await request.json()) as UpdateMemberRequest;

    const index = mockFamily.members.findIndex((m) => m.id === id);
    if (index === -1) {
      return HttpResponse.json(
        { message: `Member with id "${id}" not found` },
        { status: 404 },
      );
    }

    const existingMember = mockFamily.members[index];
    const updatedMember: FamilyMember = {
      ...existingMember,
      name: body.name,
      color: body.color,
      avatarUrl:
        body.avatarUrl !== undefined
          ? body.avatarUrl
          : existingMember.avatarUrl,
      email: body.email !== undefined ? body.email : existingMember.email,
    };

    mockFamily = {
      ...mockFamily,
      members: [
        ...mockFamily.members.slice(0, index),
        updatedMember,
        ...mockFamily.members.slice(index + 1),
      ],
    };

    return HttpResponse.json(
      createApiResponse(updatedMember, "Member updated successfully"),
    );
  }),

  // DELETE /family/members/:id - Remove member
  http.delete(`${API_BASE}/family/members/:id`, ({ params }) => {
    if (!mockFamily) {
      return HttpResponse.json(
        { message: "No family exists" },
        { status: 404 },
      );
    }

    const { id } = params;
    const index = mockFamily.members.findIndex((m) => m.id === id);

    if (index === -1) {
      return HttpResponse.json(
        { message: `Member with id "${id}" not found` },
        { status: 404 },
      );
    }

    mockFamily = {
      ...mockFamily,
      members: mockFamily.members.filter((m) => m.id !== id),
    };

    return new HttpResponse(null, { status: 204 });
  }),

  // ============================================================================
  // Auth API Handlers
  // ============================================================================

  // POST /auth/login - Login
  http.post(`${API_BASE}/auth/login`, async ({ request }) => {
    const body = (await request.json()) as LoginRequest;
    const normalizedUsername = body.username.toLowerCase().trim();

    const user = mockUsers.find((u) => u.username === normalizedUsername);
    if (!user || user.password !== body.password) {
      return HttpResponse.json(
        { message: "Invalid username or password" },
        { status: 401 },
      );
    }

    if (!mockFamily || mockFamily.id !== user.familyId) {
      return HttpResponse.json(
        { message: "Family data not found" },
        { status: 404 },
      );
    }

    const response: LoginResponse = {
      data: {
        token: `mock-token-${normalizedUsername}`,
        family: mockFamily,
      },
      message: "Login successful",
    };

    return HttpResponse.json(response);
  }),

  // POST /auth/register - Register
  http.post(`${API_BASE}/auth/register`, async ({ request }) => {
    const body = (await request.json()) as RegisterRequest;
    const normalizedUsername = body.username.toLowerCase().trim();

    // Check if username exists
    if (mockUsers.some((u) => u.username === normalizedUsername)) {
      return HttpResponse.json(
        { message: "Username already taken", field: "username" },
        { status: 409 },
      );
    }

    // Create family
    mockFamily = {
      id: `family-${Date.now()}`,
      name: body.familyName,
      members: body.members.map((m) => ({
        ...m,
        id: `member-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      })),
      createdAt: new Date().toISOString(),
    };

    // Create user
    mockUsers.push({
      username: normalizedUsername,
      password: body.password,
      familyId: mockFamily.id,
    });

    const response: RegisterResponse = {
      data: {
        token: `mock-token-${normalizedUsername}`,
        family: mockFamily,
      },
      message: "Registration successful",
    };

    return HttpResponse.json(response);
  }),

  // GET /auth/check-username - Check username availability
  http.get(`${API_BASE}/auth/check-username`, ({ request }) => {
    const url = new URL(request.url);
    const username = url.searchParams.get("username")?.toLowerCase().trim();

    const available = !mockUsers.some((u) => u.username === username);
    const response: UsernameCheckResponse = { data: { available } };

    return HttpResponse.json(response);
  }),

  // ============================================================================
  // Google Calendar API Handlers (default: disconnected state)
  // ============================================================================

  // GET /google/status/:memberId - Connection status (default: disconnected)
  http.get(`${API_BASE}/google/status/:memberId`, () => {
    return HttpResponse.json(
      createApiResponse({ connected: false, calendars: [] }),
    );
  }),

  // GET /google/calendars/:memberId - Calendar list (default: empty)
  http.get(`${API_BASE}/google/calendars/:memberId`, () => {
    return HttpResponse.json(createApiResponse([]));
  }),
];

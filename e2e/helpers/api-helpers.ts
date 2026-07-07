import type { APIRequestContext, Page } from "@playwright/test";
import type { CreateEventRequest } from "../../src/lib/types/calendar";
import type {
  ChoreTemplate,
  CreateChoreTemplateRequest,
  UpdateCurrentPeriodCompletionRequest,
} from "../../src/lib/types/chores";
import type { FamilyColor } from "../../src/lib/types/family";
import type {
  CreateListItemRequest,
  CreateListRequest,
  ListDetail,
} from "../../src/lib/types/lists";
import type {
  MealSlot,
  MealType,
  UpsertMealSlotRequest,
} from "../../src/lib/types/meals";
import type { CreateRecipeRequest } from "../../src/lib/types/recipes";

const API_BASE = "http://127.0.0.1:8080/api";

interface RegisterOptions {
  familyName: string;
  members: Array<{ name: string; color: FamilyColor }>;
  timezone?: string;
}

interface RegistrationResult {
  token: string;
  family: {
    id: string;
    name: string;
    members: Array<{ id: string; name: string; color: FamilyColor }>;
    createdAt: string;
  };
}

/**
 * Register a new family via the real backend API.
 * Generates a unique username per call to avoid conflicts.
 */
export async function registerFamily(
  request: APIRequestContext,
  options: RegisterOptions,
): Promise<RegistrationResult> {
  // BE validates: lowercase letters, numbers, underscores only, 3-20 chars
  const unique = Math.random().toString(36).slice(2, 10);
  const username = `t_${unique}`;

  const response = await request.post(`${API_BASE}/auth/register`, {
    data: {
      username,
      password: "TestPassword123!",
      familyName: options.familyName,
      members: options.members,
      timezone: options.timezone ?? "America/Los_Angeles",
    },
  });

  if (!response.ok()) {
    const body = await response.text();
    throw new Error(`Registration failed (${response.status()}): ${body}`);
  }

  const json = await response.json();
  return json.data;
}

/**
 * Seed browser localStorage with real auth token and family data.
 * Must be called after page.goto() but before reload.
 */
export async function seedBrowserAuth(
  page: Page,
  registration: RegistrationResult,
): Promise<void> {
  await page.evaluate(({ token, family }) => {
    // Auth token — same key the app reads
    localStorage.setItem("family-hub-auth-token", token);

    // Family data — Zustand persist format
    localStorage.setItem(
      "family-hub-family",
      JSON.stringify({
        state: { family, _hasHydrated: true },
        version: 0,
      }),
    );
  }, registration);
}

/**
 * Create a calendar event through the real backend API using an authenticated token.
 */
export async function createCalendarEvent(
  request: APIRequestContext,
  token: string,
  event: CreateEventRequest,
): Promise<void> {
  const response = await request.post(`${API_BASE}/calendar/events`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    data: event,
  });

  if (!response.ok()) {
    const body = await response.text();
    throw new Error(`Create event failed (${response.status()}): ${body}`);
  }
}

/**
 * Create a recipe through the real backend API using an authenticated token.
 */
export async function createRecipe(
  request: APIRequestContext,
  token: string,
  recipe: CreateRecipeRequest,
): Promise<{ id: string; title: string }> {
  const response = await request.post(`${API_BASE}/recipes`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    data: recipe,
  });

  if (!response.ok()) {
    const body = await response.text();
    throw new Error(`Create recipe failed (${response.status()}): ${body}`);
  }

  const json = await response.json();
  return json.data;
}

/**
 * Plan a meal into a specific slot of a week via the real backend
 * `PUT /meals/slots` (the same endpoint the composer/planning UI drives).
 *
 * Seeding meals through the API keeps the ingredients-to-grocery E2E focused on
 * the review → append journey rather than re-walking the multi-step planning
 * flow (already covered by mobile-meals.spec.ts). `dayIndex` is 0=Sunday..6=Sat,
 * matching the board contract and the weekday labels in the review sheet.
 */
export async function planMealSlot(
  request: APIRequestContext,
  token: string,
  slot: {
    weekStartDate: string;
    dayIndex: number;
    mealType: MealType;
    /** recipe-backed when recipeId is set; a quick meal otherwise. */
    recipeId?: string;
    title: string;
  },
): Promise<void> {
  const body: UpsertMealSlotRequest = {
    weekStartDate: slot.weekStartDate,
    dayIndex: slot.dayIndex,
    mealType: slot.mealType,
    primary: {
      sourceType: slot.recipeId ? "recipe" : "quick",
      recipeId: slot.recipeId ?? null,
      title: slot.title,
      imageUrl: null,
      note: null,
    },
    extras: [],
    note: null,
    collisionMode: null,
  };

  const response = await request.put(`${API_BASE}/meals/slots`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    data: body,
  });

  if (!response.ok()) {
    const responseBody = await response.text();
    throw new Error(
      `Plan meal slot failed (${response.status()}): ${responseBody}`,
    );
  }
}

/**
 * Create a chore template through the real backend API using an authenticated token.
 */
export async function createChoreTemplate(
  request: APIRequestContext,
  token: string,
  chore: CreateChoreTemplateRequest,
): Promise<ChoreTemplate> {
  const response = await request.post(`${API_BASE}/chores/templates`, {
    headers: { Authorization: `Bearer ${token}` },
    data: chore,
  });
  if (!response.ok()) {
    throw new Error(
      `Create chore failed (${response.status()}): ${await response.text()}`,
    );
  }
  const json = await response.json();
  return json.data;
}

/**
 * Mark a chore template's current period as complete through the real backend API.
 */
export async function completeCurrentChore(
  request: APIRequestContext,
  token: string,
  templateId: string,
  completion: UpdateCurrentPeriodCompletionRequest,
): Promise<void> {
  const response = await request.put(
    `${API_BASE}/chores/templates/${templateId}/current-period-completion`,
    {
      headers: { Authorization: `Bearer ${token}` },
      data: completion,
    },
  );
  if (!response.ok()) {
    throw new Error(
      `Complete chore failed (${response.status()}): ${await response.text()}`,
    );
  }
}

/**
 * Upsert a meal slot through the real backend API using an authenticated token.
 */
export async function upsertMealSlot(
  request: APIRequestContext,
  token: string,
  slot: UpsertMealSlotRequest,
): Promise<MealSlot> {
  const response = await request.put(`${API_BASE}/meals/slots`, {
    headers: { Authorization: `Bearer ${token}` },
    data: slot,
  });
  if (!response.ok()) {
    throw new Error(
      `Upsert meal failed (${response.status()}): ${await response.text()}`,
    );
  }
  const json = await response.json();
  return json.data;
}

/**
 * Create a list through the real backend API using an authenticated token.
 */
export async function createList(
  request: APIRequestContext,
  token: string,
  list: CreateListRequest,
): Promise<ListDetail> {
  const response = await request.post(`${API_BASE}/lists`, {
    headers: { Authorization: `Bearer ${token}` },
    data: list,
  });
  if (!response.ok()) {
    throw new Error(
      `Create list failed (${response.status()}): ${await response.text()}`,
    );
  }
  const json = await response.json();
  return json.data;
}

/**
 * Create a list item through the real backend API using an authenticated token.
 */
export async function createListItem(
  request: APIRequestContext,
  token: string,
  listId: string,
  item: CreateListItemRequest,
): Promise<void> {
  const response = await request.post(`${API_BASE}/lists/${listId}/items`, {
    headers: { Authorization: `Bearer ${token}` },
    data: item,
  });
  if (!response.ok()) {
    throw new Error(
      `Create list item failed (${response.status()}): ${await response.text()}`,
    );
  }
}

import type { PersistedClient } from "@tanstack/react-query-persist-client";
import { z } from "zod";

/**
 * Response-shape validators for the persisted offline read cache.
 *
 * These are deliberately SEPARATE from the form/request schemas in
 * `src/lib/validations/*` — those validate user input, not API responses, and
 * do not cover the cached shapes (e.g. calendar `date` is a `Date`, chores are
 * a nested board). Hydrated data is untrusted (it survives logout, app
 * upgrades, and manual IndexedDB tampering), so every allowlisted family is
 * validated on restore and malformed entries are dropped without crashing.
 *
 * Schemas validate STRUCTURE only and are intentionally lenient about extra
 * fields: Zod strips unknown keys on parse, but callers keep the ORIGINAL data
 * on success, so fields the UI relies on (e.g. event `description`, `htmlLink`)
 * are never lost.
 */

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

/** API responses are wrapped as `{ data, message? }`. */
function apiResponse<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({ data: dataSchema });
}

// Response-side enums are deliberately validated as plain non-empty strings,
// NOT z.enum(...). These gate already-served backend data for STRUCTURE only;
// pinning the enum would make a future backend addition (a new family color,
// list kind, or chore scope) fail validation and silently drop that family's
// entire persisted cache on restore. Form/request schemas in
// `src/lib/validations/*` keep the strict enums where they belong.
const familyColorSchema = z.string().min(1);

const familyMemberSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  color: familyColorSchema,
  // The backend returns null (not absent) for an unset avatar/email, so accept
  // null too — pinning these to string|undefined drops a real family's entire
  // persisted cache on restore.
  avatarUrl: z.string().nullish(),
  email: z.string().nullish(),
});

const familyDataSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  timezone: z.string().optional(),
  members: z.array(familyMemberSchema),
  createdAt: z.string().min(1),
});

// `date`/`endDate` are real `Date` objects in cache (idb-keyval structured
// clone preserves them); accept strings too for defensiveness.
const dateLike = z.union([z.date(), z.string().min(1)]);

const calendarEventSchema = z.object({
  id: z.string().nullable(),
  title: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  date: dateLike,
  memberId: z.string(),
  isAllDay: z.boolean(),
});

const choreSummarySchema = z.object({
  total: z.number(),
  completed: z.number(),
  remaining: z.number(),
});
const choreScopeBoardSchema = z.object({
  // Response-side: drift-tolerant string, not z.enum (see familyColorSchema).
  scope: z.string().min(1),
  periodStartDate: z.string(),
  periodEndDate: z.string(),
  summary: choreSummarySchema,
  assignees: z.array(z.unknown()),
});
const choresBoardSchema = z.object({
  timezone: z.string(),
  today: choreScopeBoardSchema,
  thisWeek: choreScopeBoardSchema,
  thisMonth: choreScopeBoardSchema,
});

// Response-side: drift-tolerant string, not z.enum (see familyColorSchema).
const listKindSchema = z.string().min(1);
const listSummarySchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  kind: listKindSchema,
  totalItems: z.number(),
  completedItems: z.number(),
});
const listItemSchema = z.object({
  id: z.string().min(1),
  text: z.string(),
  completed: z.boolean(),
  completedAt: z.string().nullable(),
  categoryId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// Structural category-option schema for persisted list-detail.
// Requires the four fields present on ListCategoryOption; lenient to legacy
// extra fields such as `seeded` that may exist in cached responses from before
// the v1.7.0 BE release. We validate structure, not enum membership, so a
// future new kind does not silently drop a family's offline cache on restore.
const listCategoryOptionSchema = z.object({
  id: z.string().min(1),
  kind: z.string().min(1),
  name: z.string().min(1),
  sortOrder: z.number(),
});

const listDetailSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  kind: listKindSchema,
  categoryDisplayMode: z.enum(["grouped", "flat"]),
  showCompletedOverride: z.boolean().nullable(),
  categories: z.array(listCategoryOptionSchema),
  items: z.array(listItemSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});
const listPreferencesSchema = z.object({
  showCompletedByDefault: z.boolean(),
});

const mealBoardSchema = z.object({
  weekStartDate: z.string(),
  days: z.array(
    z.object({
      date: z.string(),
      dayIndex: z.number(),
      slots: z.array(z.unknown()),
    }),
  ),
});

const recipeSummarySchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  imageUrl: z.string().nullable(),
  favorite: z.boolean(),
  tags: z.array(z.string()),
  updatedAt: z.string(),
});
const recipeDetailSchema = recipeSummarySchema.extend({
  ingredients: z.array(z.string()),
  instructions: z.array(z.string()),
  note: z.string().nullable(),
  sourceUrl: z.string().nullable(),
});

// ---------------------------------------------------------------------------
// Per-family validator registry, keyed by [domain, sub]
// ---------------------------------------------------------------------------

const familyResponseSchema = apiResponse(familyDataSchema.nullable());
const calendarListResponseSchema = apiResponse(z.array(calendarEventSchema));
const calendarEventResponseSchema = apiResponse(calendarEventSchema);
const choresResponseSchema = apiResponse(choresBoardSchema);
const listsHubResponseSchema = apiResponse(z.array(listSummarySchema));
const listsDetailResponseSchema = apiResponse(listDetailSchema);
const listsPreferencesResponseSchema = apiResponse(listPreferencesSchema);
const mealsResponseSchema = apiResponse(mealBoardSchema);
const recipesListResponseSchema = apiResponse(z.array(recipeSummarySchema));
const recipesDetailResponseSchema = apiResponse(recipeDetailSchema);

/**
 * Resolve the response schema for a query key, or `null` if the key is not a
 * recognised offline-read family (which means: drop it on restore).
 */
function schemaForQueryKey(queryKey: readonly unknown[]): z.ZodTypeAny | null {
  const [domain, sub] = queryKey;
  switch (domain) {
    case "family":
      return sub === "data" ? familyResponseSchema : null;
    case "calendar":
      if (sub !== "events") return null;
      // eventList(params) has a 3rd key element; event(id) has an id string.
      return typeof queryKey[2] === "string"
        ? calendarEventResponseSchema
        : calendarListResponseSchema;
    case "chores":
      return sub === "board" ? choresResponseSchema : null;
    case "lists":
      if (sub === "hub") return listsHubResponseSchema;
      if (sub === "detail") return listsDetailResponseSchema;
      if (sub === "preferences") return listsPreferencesResponseSchema;
      return null;
    case "meals":
      return sub === "board" ? mealsResponseSchema : null;
    case "recipes":
      if (sub === "list") return recipesListResponseSchema;
      if (sub === "detail") return recipesDetailResponseSchema;
      return null;
    default:
      return null;
  }
}

/**
 * Whether persisted `data` matches the expected response shape for `queryKey`.
 * Unknown query families return `false` so they are dropped defensively.
 */
export function validatePersistedQueryData(
  queryKey: readonly unknown[],
  data: unknown,
): boolean {
  const schema = schemaForQueryKey(queryKey);
  if (!schema) return false;
  return schema.safeParse(data).success;
}

/**
 * The element schema for an allowlisted query family whose response `data` is
 * an array (`{ data: [...] }`), or `null` for object-shaped families.
 *
 * Array families filter malformed ENTRIES on restore (see {@link
 * restorePersistedClient}) so one bad item does not discard a whole cached
 * collection — e.g. a single corrupt event must not wipe the entire month's
 * offline calendar. Object families stay all-or-nothing.
 */
function arrayElementSchemaForQueryKey(
  queryKey: readonly unknown[],
): z.ZodTypeAny | null {
  const [domain, sub] = queryKey;
  switch (domain) {
    case "calendar":
      // eventList(params) is an array; event(id) (3rd key is a string) is not.
      if (sub !== "events") return null;
      return typeof queryKey[2] === "string" ? null : calendarEventSchema;
    case "lists":
      return sub === "hub" ? listSummarySchema : null;
    case "recipes":
      return sub === "list" ? recipeSummarySchema : null;
    default:
      return null;
  }
}

function isDataArrayEnvelope(data: unknown): data is { data: unknown[] } {
  return (
    typeof data === "object" &&
    data !== null &&
    "data" in data &&
    Array.isArray((data as { data: unknown }).data)
  );
}

// ---------------------------------------------------------------------------
// Avatar/photo scope: strip data: URL avatars before persisting
// ---------------------------------------------------------------------------

function isDataUrl(value: unknown): boolean {
  return typeof value === "string" && value.startsWith("data:");
}

/**
 * Return a copy of the family response with any `data:` URL member avatars
 * removed. Inline base64 images are the only "binary" data that could reach the
 * family query, so stripping them honours the "no photos/binary in the
 * persisted cache" rule. Short http(s) avatar URL references are kept so
 * avatars still render offline. Done immutably — the live query cache shares
 * these objects and must not be mutated.
 */
function stripAvatarBinary(data: unknown): unknown {
  if (
    typeof data !== "object" ||
    data === null ||
    !("data" in data) ||
    typeof (data as { data: unknown }).data !== "object" ||
    (data as { data: unknown }).data === null
  ) {
    return data;
  }

  const family = (data as { data: { members?: unknown } }).data;
  if (!Array.isArray(family.members)) return data;

  let changed = false;
  const members = family.members.map((member) => {
    if (
      member &&
      typeof member === "object" &&
      isDataUrl((member as { avatarUrl?: unknown }).avatarUrl)
    ) {
      changed = true;
      const { avatarUrl: _stripped, ...rest } = member as Record<
        string,
        unknown
      >;
      return rest;
    }
    return member;
  });

  if (!changed) return data;
  return { ...(data as object), data: { ...family, members } };
}

/** If `recipe.imageUrl` is a `data:` URL, return a copy with it nulled. */
function stripRecipeImage(recipe: unknown): unknown {
  if (
    recipe &&
    typeof recipe === "object" &&
    isDataUrl((recipe as { imageUrl?: unknown }).imageUrl)
  ) {
    return { ...(recipe as object), imageUrl: null };
  }
  return recipe;
}

/**
 * Strip `data:` URL images from a recipes response — the list shape
 * (`{ data: [recipe] }`) or the detail shape (`{ data: recipe }`). Inline
 * base64 images are the only binary that could reach the recipes cache, so
 * nulling them honors the same "no photos/binary in the persisted cache" rule
 * applied to family avatars. Returns the original reference when there is
 * nothing to strip. Latent today (the backend serves http(s) `imageUrl`s) but
 * it closes the rule so a future `data:` image can't be persisted as binary.
 */
function stripRecipeImageBinary(data: unknown, isList: boolean): unknown {
  if (typeof data !== "object" || data === null || !("data" in data)) {
    return data;
  }
  const payload = (data as { data: unknown }).data;

  if (isList) {
    if (!Array.isArray(payload)) return data;
    let changed = false;
    const recipes = payload.map((recipe) => {
      const stripped = stripRecipeImage(recipe);
      if (stripped !== recipe) changed = true;
      return stripped;
    });
    return changed ? { ...(data as object), data: recipes } : data;
  }

  const stripped = stripRecipeImage(payload);
  return stripped === payload ? data : { ...(data as object), data: stripped };
}

/**
 * Strip binary (`data:` URLs) from a single query's data before persisting.
 * Family member avatars and recipe images are the only fields that can carry
 * inline base64; everything else is passed through by reference (idb-keyval
 * structured-clones on write, so this is read-only).
 */
function sanitizeQueryData(
  queryKey: readonly unknown[],
  data: unknown,
): unknown {
  const [domain, sub] = queryKey;
  if (domain === "family") return stripAvatarBinary(data);
  if (domain === "recipes" && sub === "list") {
    return stripRecipeImageBinary(data, true);
  }
  if (domain === "recipes" && sub === "detail") {
    return stripRecipeImageBinary(data, false);
  }
  return data;
}

/**
 * Return a copy of the dehydrated client safe to persist: strips `data:` URL
 * binary (family avatars, recipe images). Other queries are passed through by
 * reference.
 */
export function sanitizePersistedClient(
  client: PersistedClient,
): PersistedClient {
  const queries = client.clientState.queries.map((query) => {
    const sanitized = sanitizeQueryData(query.queryKey, query.state.data);
    if (sanitized === query.state.data) return query;
    return { ...query, state: { ...query.state, data: sanitized } };
  });

  return {
    ...client,
    clientState: { ...client.clientState, queries },
  };
}

// ---------------------------------------------------------------------------
// Restore: validate + filter, drop corrupt clients/queries
// ---------------------------------------------------------------------------

function isPersistedClientShape(value: unknown): value is PersistedClient {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as { clientState?: { queries?: unknown } };
  return (
    typeof candidate.clientState === "object" &&
    candidate.clientState !== null &&
    Array.isArray(candidate.clientState.queries)
  );
}

/** Sentinel returned by {@link restoreQueryData} to drop a whole query. */
const DROP_QUERY = Symbol("drop-query");

/**
 * Validate one persisted query's data on restore.
 *
 * Array families keep the query and drop only malformed ENTRIES; object
 * families are all-or-nothing. Returns the data to keep (the original reference
 * when nothing was filtered, so extra fields the UI relies on survive), or
 * {@link DROP_QUERY} to discard the whole query.
 */
function restoreQueryData(
  queryKey: readonly unknown[],
  data: unknown,
): unknown {
  const elementSchema = arrayElementSchemaForQueryKey(queryKey);
  if (elementSchema) {
    // The envelope itself must be `{ data: [...] }`; otherwise drop the query.
    if (!isDataArrayEnvelope(data)) return DROP_QUERY;
    const kept = data.data.filter(
      (item) => elementSchema.safeParse(item).success,
    );
    if (kept.length === data.data.length) return data; // all valid → keep original
    return { ...data, data: kept };
  }
  return validatePersistedQueryData(queryKey, data) ? data : DROP_QUERY;
}

/**
 * Validate a restored PersistedClient: drop any query (or, for array families,
 * any malformed entry) whose data does not match its expected response shape,
 * and return `undefined` if the client itself is structurally corrupt.
 * `buster`/`timestamp` are preserved so TanStack's version-buster and `maxAge`
 * checks still run after this filter.
 */
export function restorePersistedClient(
  client: unknown,
): PersistedClient | undefined {
  try {
    if (!isPersistedClientShape(client)) return undefined;

    const queries = client.clientState.queries.flatMap((query) => {
      const data = restoreQueryData(query.queryKey, query.state.data);
      if (data === DROP_QUERY) return [];
      if (data === query.state.data) return [query];
      return [{ ...query, state: { ...query.state, data } }];
    });

    return {
      ...client,
      clientState: { ...client.clientState, queries },
    };
  } catch {
    return undefined;
  }
}

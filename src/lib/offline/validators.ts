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

const familyColorSchema = z.enum([
  "coral",
  "teal",
  "green",
  "purple",
  "yellow",
  "pink",
  "orange",
]);

const familyMemberSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  color: familyColorSchema,
  avatarUrl: z.string().optional(),
  email: z.string().optional(),
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
  scope: z.enum(["TODAY", "THIS_WEEK", "THIS_MONTH"]),
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

const listKindSchema = z.enum(["grocery", "to-do", "general"]);
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
const listDetailSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  kind: listKindSchema,
  categoryDisplayMode: z.enum(["grouped", "flat"]),
  showCompletedOverride: z.boolean().nullable(),
  categories: z.array(z.unknown()),
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

/**
 * Return a copy of the dehydrated client safe to persist: strips `data:` URL
 * avatars from the family query. Other queries are passed through by reference
 * (idb-keyval structured-clones them on write, so this is read-only).
 */
export function sanitizePersistedClient(
  client: PersistedClient,
): PersistedClient {
  const queries = client.clientState.queries.map((query) => {
    if (query.queryKey[0] !== "family") return query;
    const sanitized = stripAvatarBinary(query.state.data);
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

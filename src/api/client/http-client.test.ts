import { HttpResponse, http } from "msw";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { AUTH_TOKEN_STORAGE_KEY, FAMILY_STORAGE_KEY } from "@/lib/constants";
import * as offlinePersister from "@/lib/offline/persister";
import { server } from "@/test/mocks/server";
import { createHttpClient, handleUnauthorized } from "./http-client";

// MSW server setup
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterAll(() => server.close());
afterEach(() => server.resetHandlers());

describe("createHttpClient URL resolution", () => {
  it("preserves base URL path when endpoint has leading slash", async () => {
    // Handler at /api/family — if the /api prefix is dropped, this won't match
    server.use(
      http.get("http://localhost:9999/api/family", () => {
        return HttpResponse.json({ data: "ok" });
      }),
    );

    const client = createHttpClient({
      baseUrl: "http://localhost:9999/api",
    });

    const result = await client.get<{ data: string }>("/family");
    expect(result.data).toBe("ok");
  });

  it("works with endpoint without leading slash", async () => {
    server.use(
      http.get("http://localhost:9999/api/calendar/events", () => {
        return HttpResponse.json({ data: [] });
      }),
    );

    const client = createHttpClient({
      baseUrl: "http://localhost:9999/api",
    });

    const result = await client.get<{ data: unknown[] }>("calendar/events");
    expect(result.data).toEqual([]);
  });

  it("works when base URL already has trailing slash", async () => {
    server.use(
      http.get("http://localhost:9999/api/family", () => {
        return HttpResponse.json({ data: "ok" });
      }),
    );

    const client = createHttpClient({
      baseUrl: "http://localhost:9999/api/",
    });

    const result = await client.get<{ data: string }>("/family");
    expect(result.data).toBe("ok");
  });
});

describe("createHttpClient relative base URL resolution", () => {
  // jsdom origin is http://localhost:3000 (from vitest.config.ts),
  // so "/api" resolves to "http://localhost:3000/api/"

  it("resolves relative base URL against window.location.origin", async () => {
    server.use(
      http.get("http://localhost:3000/api/family", () => {
        return HttpResponse.json({ data: "ok" });
      }),
    );

    const client = createHttpClient({ baseUrl: "/api" });

    const result = await client.get<{ data: string }>("/family");
    expect(result.data).toBe("ok");
  });

  it("resolves relative base URL with trailing slash", async () => {
    server.use(
      http.get("http://localhost:3000/api/family", () => {
        return HttpResponse.json({ data: "ok" });
      }),
    );

    const client = createHttpClient({ baseUrl: "/api/" });

    const result = await client.get<{ data: string }>("/family");
    expect(result.data).toBe("ok");
  });
});

describe("handleUnauthorized (401 session cleanup)", () => {
  const originalLocation = window.location;

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
  });

  it("clears token, family storage, and offline cache before reloading", async () => {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, "token-123");
    localStorage.setItem(FAMILY_STORAGE_KEY, "family-blob");
    const clearSpy = vi
      .spyOn(offlinePersister, "clearOfflineReadCache")
      .mockResolvedValue(undefined);
    const reload = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...originalLocation, reload },
    });

    await handleUnauthorized();

    expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(FAMILY_STORAGE_KEY)).toBeNull();
    expect(clearSpy).toHaveBeenCalledTimes(1);
    expect(reload).toHaveBeenCalled();
    // Offline cache must be cleared BEFORE the reload navigates away.
    expect(clearSpy.mock.invocationCallOrder[0]).toBeLessThan(
      reload.mock.invocationCallOrder[0],
    );
  });

  it("does not reload on a first-visit 401 (no token) but still clears the offline cache", async () => {
    const clearSpy = vi
      .spyOn(offlinePersister, "clearOfflineReadCache")
      .mockResolvedValue(undefined);
    const reload = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...originalLocation, reload },
    });

    await handleUnauthorized();

    expect(clearSpy).toHaveBeenCalledTimes(1);
    expect(reload).not.toHaveBeenCalled();
  });
});

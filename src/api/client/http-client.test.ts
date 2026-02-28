import { HttpResponse, http } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { server } from "@/test/mocks/server";
import { createHttpClient } from "./http-client";

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

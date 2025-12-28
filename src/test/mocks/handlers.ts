// import { http, HttpResponse } from "msw";

/**
 * MSW request handlers for API mocking in tests.
 *
 * Usage in tests:
 * ```typescript
 * import { server } from "@/test/mocks/server";
 * import { http, HttpResponse } from "msw";
 *
 * // Override a handler for a specific test
 * server.use(
 *   http.get("/api/events", () => {
 *     return HttpResponse.json({ events: [] });
 *   })
 * );
 * ```
 *
 * Add your API handlers below as the app grows.
 */
export const handlers = [
  // Example: Calendar events endpoint
  // http.get("/api/calendar/events", () => {
  //   return HttpResponse.json({
  //     events: [
  //       { id: "1", title: "Test Event", date: "2025-01-01" }
  //     ]
  //   });
  // }),
];

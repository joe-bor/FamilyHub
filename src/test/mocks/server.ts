import { setupServer } from "msw/node";
import {
  API_BASE,
  getMockEvents,
  handlers,
  resetMockEvents,
  seedMockEvents,
} from "./handlers";

/**
 * MSW server instance for Node.js (Vitest) tests.
 *
 * Usage:
 * ```typescript
 * import { server, seedMockEvents, resetMockEvents } from "@/test/mocks/server";
 *
 * beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
 * afterEach(() => {
 *   server.resetHandlers();
 *   resetMockEvents();
 * });
 * afterAll(() => server.close());
 *
 * it("displays events", () => {
 *   seedMockEvents([testEvent]);
 *   // test code...
 * });
 * ```
 *
 * Or use the helper:
 * ```typescript
 * import { setupMswServer, seedMockEvents } from "@/test/mocks/server";
 *
 * setupMswServer();
 *
 * it("displays events", () => {
 *   seedMockEvents([testEvent]);
 *   // test code...
 * });
 * ```
 */
export const server = setupServer(...handlers);

/**
 * Helper to set up MSW server lifecycle hooks in a describe block.
 * Automatically resets mock data between tests.
 */
export function setupMswServer() {
  beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
  afterEach(() => {
    server.resetHandlers();
    resetMockEvents();
  });
  afterAll(() => server.close());
}

// Re-export mock data helpers and constants
export { API_BASE, getMockEvents, resetMockEvents, seedMockEvents };

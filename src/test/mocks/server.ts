import { setupServer } from "msw/node";
import { handlers } from "./handlers";

/**
 * MSW server instance for Node.js (Vitest) tests.
 *
 * This is NOT automatically started in setup.ts - import and use it
 * in test files that need API mocking:
 *
 * ```typescript
 * import { server } from "@/test/mocks/server";
 * import { beforeAll, afterEach, afterAll } from "vitest";
 *
 * beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
 * afterEach(() => server.resetHandlers());
 * afterAll(() => server.close());
 *
 * // Your tests here...
 * ```
 *
 * Or use a helper pattern:
 *
 * ```typescript
 * import { setupMswServer } from "@/test/mocks/server";
 *
 * setupMswServer(); // Registers beforeAll/afterEach/afterAll hooks
 * ```
 */
export const server = setupServer(...handlers);

/**
 * Helper to set up MSW server lifecycle hooks in a describe block.
 * Call this at the top of your test file or describe block.
 */
export function setupMswServer() {
  beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());
}

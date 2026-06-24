import { HttpResponse, http } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type { RemoveMealSlotRequest } from "@/lib/types";
import { API_BASE, server } from "@/test/mocks/server";
import { mealsService } from "./meals.service";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("mealsService.removeSlot", () => {
  /**
   * Capture the raw outgoing DELETE so we can assert the wire contract directly,
   * independent of the shared handler. The body is read as text (not json) so an
   * empty body — the regression we are guarding against — is observable rather
   * than throwing inside the handler.
   */
  function captureDeleteRequest() {
    const captured = { body: "", url: "" };
    server.use(
      http.delete(`${API_BASE}/meals/slots`, async ({ request }) => {
        captured.url = request.url;
        captured.body = await request.text();
        return HttpResponse.json({
          data: { weekStartDate: "2026-06-07", days: [] },
          message: "Meal slot removed successfully",
        });
      }),
    );
    return captured;
  }

  it("sends the RemoveMealSlotRequest as the DELETE JSON body, not query params", async () => {
    const captured = captureDeleteRequest();
    const request: RemoveMealSlotRequest = {
      weekStartDate: "2026-06-07",
      dayIndex: 1,
      mealType: "dinner",
    };

    await mealsService.removeSlot(request);

    // The released backend reads a @RequestBody — the payload must travel as the
    // JSON body, never as query parameters.
    expect(captured.body).not.toBe("");
    expect(JSON.parse(captured.body)).toEqual(request);

    const url = new URL(captured.url);
    expect(url.searchParams.get("weekStartDate")).toBeNull();
    expect(url.searchParams.get("dayIndex")).toBeNull();
    expect(url.searchParams.get("mealType")).toBeNull();
  });

  it("keeps dayIndex 0 (Sunday) in the JSON body", async () => {
    const captured = captureDeleteRequest();
    const request: RemoveMealSlotRequest = {
      weekStartDate: "2026-06-07",
      dayIndex: 0,
      mealType: "breakfast",
    };

    await mealsService.removeSlot(request);

    expect(JSON.parse(captured.body)).toEqual(request);
  });
});

import { HttpResponse, http } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { API_BASE, server } from "@/test/mocks/server";
import { listsService } from "./lists.service";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("listsService.createItemsBulk", () => {
  it("posts selected rows to /lists/:id/items/bulk", async () => {
    const captured = { url: "", body: "" };
    server.use(
      http.post(`${API_BASE}/lists/list-1/items/bulk`, async ({ request }) => {
        captured.url = request.url;
        captured.body = await request.text();
        return HttpResponse.json({
          data: [
            {
              id: "i1",
              text: "2 eggs",
              completed: false,
              completedAt: null,
              categoryId: null,
              createdAt: "",
              updatedAt: "",
            },
          ],
          message: "List items added successfully",
        });
      }),
    );

    await listsService.createItemsBulk("list-1", {
      items: [{ text: "2 eggs" }],
    });

    expect(new URL(captured.url).pathname).toBe("/api/lists/list-1/items/bulk");
    expect(JSON.parse(captured.body)).toEqual({ items: [{ text: "2 eggs" }] });
  });
});

import { HttpResponse, http } from "msw";
import { listsKeys } from "@/api";
import type { ListDetail, ListSummary } from "@/lib/types";
import { useAppStore } from "@/stores";
import {
  API_BASE,
  seedMockListPreferences,
  seedMockLists,
  server,
  setupMswServer,
} from "@/test/mocks/server";
import {
  createTestQueryClient,
  render,
  renderWithUser,
  screen,
  waitFor,
} from "@/test/test-utils";
import { ListsLargeScreen } from "./lists-large-screen";

function listDetail(id: string, name: string): ListDetail {
  return {
    id,
    name,
    kind: "general",
    categoryDisplayMode: "flat",
    showCompletedOverride: null,
    categories: [],
    items: [],
    createdAt: "2026-07-11T09:00:00",
    updatedAt: "2026-07-11T09:00:00",
  };
}

function listSummary(list: ListDetail): ListSummary {
  return {
    id: list.id,
    name: list.name,
    kind: list.kind,
    totalItems: list.items.length,
    completedItems: list.items.filter((item) => item.completed).length,
  };
}

describe("ListsLargeScreen", () => {
  setupMswServer();

  it("waits for an active hub refetch before consuming a list detail intent", async () => {
    const existing = listDetail("list-existing", "Existing list");
    const target = listDetail("list-target", "Target list");
    seedMockLists([existing, target]);
    seedMockListPreferences({ showCompletedByDefault: true });

    let resolveRefetchStarted!: () => void;
    const refetchStarted = new Promise<void>((resolve) => {
      resolveRefetchStarted = resolve;
    });
    let resolveHubRefetch!: () => void;
    const hubRefetchCanFinish = new Promise<void>((resolve) => {
      resolveHubRefetch = resolve;
    });
    server.use(
      http.get(`${API_BASE}/lists`, async () => {
        resolveRefetchStarted();
        await hubRefetchCanFinish;
        return HttpResponse.json({
          data: [listSummary(existing), listSummary(target)],
        });
      }),
    );

    const queryClient = createTestQueryClient();
    queryClient.setQueryData(listsKeys.hub(), {
      data: [listSummary(existing)],
    });
    useAppStore.getState().openListDetail(target.id);

    render(<ListsLargeScreen />, { queryClient });
    await refetchStarted;

    try {
      expect(useAppStore.getState().listDetailIntent).toBe(target.id);
    } finally {
      resolveHubRefetch();
    }

    expect(
      await screen.findByRole("heading", { name: target.name }),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(useAppStore.getState().listDetailIntent).toBeNull();
    });
  });

  it("keeps a list detail intent pending across a failed hub refetch and retry", async () => {
    const existing = listDetail("list-existing", "Existing list");
    const target = listDetail("list-target", "Target list");
    seedMockLists([existing, target]);
    seedMockListPreferences({ showCompletedByDefault: true });

    let hubRequests = 0;
    server.use(
      http.get(`${API_BASE}/lists`, () => {
        hubRequests += 1;
        if (hubRequests === 1) {
          return HttpResponse.json(
            { message: "Temporary server error" },
            { status: 500 },
          );
        }

        return HttpResponse.json({
          data: [listSummary(existing), listSummary(target)],
        });
      }),
    );

    const queryClient = createTestQueryClient();
    queryClient.setQueryData(listsKeys.hub(), {
      data: [listSummary(existing)],
    });
    useAppStore.getState().openListDetail(target.id);

    const { user } = renderWithUser(<ListsLargeScreen />, { queryClient });
    const retry = await screen.findByRole("button", { name: "Try again" });

    expect(useAppStore.getState().listDetailIntent).toBe(target.id);
    await user.click(retry);

    expect(
      await screen.findByRole("heading", { name: target.name }),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(useAppStore.getState().listDetailIntent).toBeNull();
    });
  });
});

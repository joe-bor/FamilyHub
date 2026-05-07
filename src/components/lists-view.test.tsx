import type { ListDetail } from "@/lib/types";
import {
  seedMockListPreferences,
  seedMockLists,
  setupMswServer,
} from "@/test/mocks/server";
import {
  render,
  renderWithUser,
  screen,
  seedFamilyStore,
  typeAndWait,
  waitFor,
} from "@/test/test-utils";
import { ListsView } from "./lists-view";

const groceryList: ListDetail = {
  id: "00000000-0000-4000-8000-000000000101",
  name: "Trader Joe's Run",
  kind: "grocery",
  categoryDisplayMode: "grouped",
  showCompletedOverride: null,
  categories: [],
  items: [],
  createdAt: "2026-05-06T09:00:00",
  updatedAt: "2026-05-06T09:00:00",
};

const todoList: ListDetail = {
  id: "00000000-0000-4000-8000-000000000102",
  name: "Weekend Reset",
  kind: "to-do",
  categoryDisplayMode: "grouped",
  showCompletedOverride: null,
  categories: [],
  items: [
    {
      id: "00000000-0000-4000-8000-000000000202",
      text: "Call dentist",
      completed: false,
      completedAt: null,
      categoryId: null,
      createdAt: "2026-05-06T09:05:00",
      updatedAt: "2026-05-06T09:05:00",
    },
    {
      id: "00000000-0000-4000-8000-000000000203",
      text: "Pay bills",
      completed: true,
      completedAt: "2026-05-06T10:00:00",
      categoryId: null,
      createdAt: "2026-05-06T09:10:00",
      updatedAt: "2026-05-06T10:00:00",
    },
  ],
  createdAt: "2026-05-06T09:05:00",
  updatedAt: "2026-05-06T10:00:00",
};

describe("ListsView hub", () => {
  setupMswServer();

  beforeEach(() => {
    seedFamilyStore({
      name: "Test Family",
      members: [{ id: "1", name: "Alice", color: "coral" }],
    });
    seedMockListPreferences({ showCompletedByDefault: true });
  });

  it("renders persisted list summaries instead of placeholder cards", async () => {
    seedMockLists([groceryList, todoList]);

    render(<ListsView />);

    expect(
      await screen.findByRole("heading", { name: "My Lists" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Trader Joe's Run/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Weekend Reset/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("1 of 2 done")).toBeInTheDocument();
    expect(screen.queryByText("Gift Ideas")).not.toBeInTheDocument();
    expect(screen.queryByText("Vacation Planning")).not.toBeInTheDocument();
  });

  it("shows the no-lists empty state with a create action", async () => {
    seedMockLists([]);

    render(<ListsView />);

    expect(await screen.findByText("No lists yet")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /new list/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Grocery List")).not.toBeInTheDocument();
  });

  it("creates a new grocery list through the mobile sheet flow", async () => {
    seedMockLists([]);

    const { user } = renderWithUser(<ListsView />);

    await user.click(await screen.findByRole("button", { name: /new list/i }));
    await typeAndWait(user, screen.getByLabelText("List name"), "Target Run");
    await user.click(screen.getByRole("radio", { name: "Grocery" }));
    await user.click(screen.getByRole("button", { name: "Create list" }));

    expect(
      await screen.findByRole("heading", { name: "Target Run" }),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});

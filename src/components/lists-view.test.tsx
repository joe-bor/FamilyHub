import { delay, HttpResponse, http } from "msw";
import type { ListDetail } from "@/lib/types";
import {
  API_BASE,
  seedMockListPreferences,
  seedMockLists,
  server,
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
  categories: [
    {
      id: "00000000-0000-4000-8000-000000000301",
      kind: "grocery",
      name: "Produce",
      seeded: true,
      sortOrder: 0,
    },
    {
      id: "00000000-0000-4000-8000-000000000302",
      kind: "grocery",
      name: "Dairy",
      seeded: true,
      sortOrder: 1,
    },
  ],
  items: [
    {
      id: "00000000-0000-4000-8000-000000000201",
      text: "Bananas",
      completed: false,
      completedAt: null,
      categoryId: "00000000-0000-4000-8000-000000000301",
      createdAt: "2026-05-06T09:05:00",
      updatedAt: "2026-05-06T09:05:00",
    },
    {
      id: "00000000-0000-4000-8000-000000000202",
      text: "Spinach",
      completed: true,
      completedAt: "2026-05-06T10:00:00",
      categoryId: "00000000-0000-4000-8000-000000000301",
      createdAt: "2026-05-06T09:10:00",
      updatedAt: "2026-05-06T10:00:00",
    },
    {
      id: "00000000-0000-4000-8000-000000000203",
      text: "Paper towels",
      completed: false,
      completedAt: null,
      categoryId: null,
      createdAt: "2026-05-06T09:15:00",
      updatedAt: "2026-05-06T09:15:00",
    },
  ],
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

const generalList: ListDetail = {
  id: "00000000-0000-4000-8000-000000000103",
  name: "Movie Night",
  kind: "general",
  categoryDisplayMode: "flat",
  showCompletedOverride: null,
  categories: [],
  items: [],
  createdAt: "2026-05-06T09:20:00",
  updatedAt: "2026-05-06T09:20:00",
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

  it("does not treat a list API failure as an empty family list", async () => {
    server.use(
      http.get(`${API_BASE}/lists`, () =>
        HttpResponse.json({ message: "Server error" }, { status: 500 }),
      ),
    );

    render(<ListsView />);

    expect(
      await screen.findByText("Lists could not be loaded"),
    ).toBeInTheDocument();
    expect(screen.queryByText("No lists yet")).not.toBeInTheDocument();
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

  it("creates a list when the form is submitted with Enter", async () => {
    seedMockLists([]);

    const { user } = renderWithUser(<ListsView />);

    await user.click(await screen.findByRole("button", { name: /new list/i }));
    await typeAndWait(user, screen.getByLabelText("List name"), "Packing");
    await user.keyboard("{Enter}");

    expect(
      await screen.findByRole("heading", { name: "Packing" }),
    ).toBeInTheDocument();
  });

  it("renders grouped grocery categories, toggles flat mode, and keeps completed items muted", async () => {
    seedMockLists([groceryList]);

    const { user } = renderWithUser(<ListsView />);

    await user.click(
      await screen.findByRole("button", { name: /Trader Joe's Run/i }),
    );

    expect(screen.getByLabelText("Categories")).toHaveValue("grouped");
    expect(screen.getByText("Produce")).toBeInTheDocument();
    expect(screen.getByText("Uncategorized")).toBeInTheDocument();
    expect(screen.getByText("Spinach")).toHaveClass(
      "line-through",
      "text-muted-foreground",
    );

    await user.selectOptions(screen.getByLabelText("Categories"), "flat");

    await waitFor(() => {
      expect(screen.getByLabelText("Categories")).toHaveValue("flat");
    });
    expect(screen.queryByText("Uncategorized")).not.toBeInTheDocument();
  });

  it("does not show category controls for general lists", async () => {
    seedMockLists([generalList]);

    const { user } = renderWithUser(<ListsView />);

    await user.click(
      await screen.findByRole("button", { name: /Movie Night/i }),
    );

    expect(screen.queryByLabelText("Categories")).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Movie Night" }),
    ).toBeInTheDocument();
  });

  it("renders list detail and core item actions while preferences are loading", async () => {
    seedMockLists([todoList]);
    server.use(
      http.get(`${API_BASE}/lists/preferences`, async () => {
        await delay("infinite");
      }),
    );

    const { user } = renderWithUser(<ListsView />);

    await user.click(
      await screen.findByRole("button", { name: /Weekend Reset/i }),
    );

    expect(
      await screen.findByRole("heading", { name: "Weekend Reset" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Pay bills")).toBeInTheDocument();
    expect(screen.getByLabelText("Completed items")).toBeDisabled();
    expect(screen.getByLabelText("Show completed by default")).toBeDisabled();

    await user.click(screen.getByRole("button", { name: /^Call dentist$/ }));
    expect(screen.getByText("Call dentist")).toHaveClass("line-through");
  });

  it("renders list detail and core item actions when preferences fail", async () => {
    seedMockLists([todoList]);
    server.use(
      http.get(`${API_BASE}/lists/preferences`, () =>
        HttpResponse.json({ message: "Server error" }, { status: 500 }),
      ),
    );

    const { user } = renderWithUser(<ListsView />);

    await user.click(
      await screen.findByRole("button", { name: /Weekend Reset/i }),
    );

    expect(
      await screen.findByRole("heading", { name: "Weekend Reset" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Pay bills")).toBeInTheDocument();
    expect(screen.getByLabelText("Completed items")).toBeDisabled();
    expect(screen.getByLabelText("Show completed by default")).toBeDisabled();
    expect(
      screen.queryByText("List preferences could not be loaded"),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Add item" }));
    await typeAndWait(user, screen.getByLabelText("Item text"), "Trash bags");
    await user.click(screen.getByRole("button", { name: "Save item" }));

    expect(await screen.findByText("Trash bags")).toBeInTheDocument();
  });

  it("adds, edits, checks, unchecks, and deletes an item", async () => {
    seedMockLists([{ ...generalList, items: [] }]);

    const { user } = renderWithUser(<ListsView />);

    await user.click(
      await screen.findByRole("button", { name: /Movie Night/i }),
    );
    await user.click(screen.getByRole("button", { name: "Add item" }));
    await typeAndWait(user, screen.getByLabelText("Item text"), "Popcorn");
    await user.click(screen.getByRole("button", { name: "Save item" }));

    expect(await screen.findByText("Popcorn")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Edit" }));
    await user.clear(screen.getByLabelText("Item text"));
    await typeAndWait(user, screen.getByLabelText("Item text"), "Kettle corn");
    await user.click(screen.getByRole("button", { name: "Save item" }));

    expect(await screen.findByText("Kettle corn")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^Kettle corn$/ }));
    expect(screen.getByText("Kettle corn")).toHaveClass("line-through");

    await user.click(screen.getByRole("button", { name: /^Kettle corn$/ }));
    expect(screen.getByText("Kettle corn")).not.toHaveClass("line-through");

    await user.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(screen.queryByText("Kettle corn")).not.toBeInTheDocument();
    });
  });

  it("adds an item when the item form is submitted with Enter", async () => {
    seedMockLists([{ ...generalList, items: [] }]);

    const { user } = renderWithUser(<ListsView />);

    await user.click(
      await screen.findByRole("button", { name: /Movie Night/i }),
    );
    await user.click(screen.getByRole("button", { name: "Add item" }));
    await typeAndWait(user, screen.getByLabelText("Item text"), "Blankets");
    await user.keyboard("{Enter}");

    expect(await screen.findByText("Blankets")).toBeInTheDocument();
  });

  it("supports per-list completed override and clear completed", async () => {
    seedMockLists([todoList]);
    seedMockListPreferences({ showCompletedByDefault: true });

    const { user } = renderWithUser(<ListsView />);

    await user.click(
      await screen.findByRole("button", { name: /Weekend Reset/i }),
    );
    expect(screen.getByText("Pay bills")).toHaveClass("line-through");

    await user.selectOptions(screen.getByLabelText("Completed items"), "hide");

    await waitFor(() => {
      expect(screen.queryByText("Pay bills")).not.toBeInTheDocument();
    });

    await user.selectOptions(screen.getByLabelText("Completed items"), "show");
    expect(await screen.findByText("Pay bills")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /remove all completed/i }),
    );

    await waitFor(() => {
      expect(screen.queryByText("Pay bills")).not.toBeInTheDocument();
    });
  });

  it("disables clear completed while an item update is pending", async () => {
    seedMockLists([todoList]);
    let resolvePatchStarted: () => void = () => {};
    let resolvePatch: () => void = () => {};
    const patchStarted = new Promise<void>((resolve) => {
      resolvePatchStarted = resolve;
    });
    const patchCanFinish = new Promise<void>((resolve) => {
      resolvePatch = resolve;
    });

    server.use(
      http.patch(
        `${API_BASE}/lists/:listId/items/:itemId`,
        async ({ request }) => {
          resolvePatchStarted();
          const body = (await request.json()) as {
            text: string;
            completed: boolean;
            categoryId?: string | null;
          };

          await patchCanFinish;

          return HttpResponse.json({
            data: {
              ...todoList.items[0],
              text: body.text,
              completed: body.completed,
              completedAt: body.completed ? "2026-05-07T09:00:00" : null,
              categoryId: body.categoryId ?? null,
              updatedAt: "2026-05-07T09:00:00",
            },
            message: "List item updated successfully",
          });
        },
      ),
    );

    const { user } = renderWithUser(<ListsView />);

    await user.click(
      await screen.findByRole("button", { name: /Weekend Reset/i }),
    );
    const clearCompletedButton = screen.getByRole("button", {
      name: /remove all completed/i,
    });
    expect(clearCompletedButton).toBeEnabled();

    await user.click(screen.getByRole("button", { name: /^Call dentist$/ }));
    await patchStarted;

    try {
      await waitFor(() => {
        expect(clearCompletedButton).toBeDisabled();
      });
    } finally {
      resolvePatch();
    }
  });

  it("shows the empty-list state inside a list detail", async () => {
    seedMockLists([{ ...generalList, items: [] }]);

    const { user } = renderWithUser(<ListsView />);

    await user.click(
      await screen.findByRole("button", { name: /Movie Night/i }),
    );

    expect(screen.getByText("No items yet")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Add item" }),
    ).toBeInTheDocument();
  });
});

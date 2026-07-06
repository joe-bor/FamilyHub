import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MealBoard, MealSlotEntry, RecipeDetail } from "@/lib/types";
import { createEmptyMealsBoard } from "@/test/fixtures/meals";
import {
  API_BASE,
  seedMockRecipes,
  server,
  setupMswServer,
} from "@/test/mocks/server";
import { renderWithUser, screen, waitFor, within } from "@/test/test-utils";
import { AddIngredientsSheet } from "./add-ingredients-sheet";

// testWeekStartDate (2026-06-07) is a Sunday, so dayIndex 1 = Monday.

const recipeDinner: RecipeDetail = {
  id: "recipe-1",
  title: "Sheet Pan Salmon",
  imageUrl: null,
  ingredients: ["Salmon fillets", "Asparagus", "Lemon"],
  instructions: ["Roast"],
  note: null,
  sourceUrl: null,
  tags: ["dinner"],
  favorite: false,
  updatedAt: "2026-06-04T09:00:00",
};

function recipeEntry(
  id: string,
  recipeId: string,
  title: string,
): MealSlotEntry {
  return {
    id,
    role: "primary",
    sourceType: "recipe",
    recipeId,
    title,
    imageUrl: null,
    note: null,
  };
}

function quickEntry(id: string, title: string): MealSlotEntry {
  return {
    id,
    role: "primary",
    sourceType: "quick",
    recipeId: null,
    title,
    imageUrl: null,
    note: null,
  };
}

/** Board: Monday dinner = recipe (recipeDinner), Wednesday dinner = quick "Leftovers". */
function boardWithRecipeAndQuick(): MealBoard {
  const board = createEmptyMealsBoard();
  board.days[1].slots[2].primary = recipeEntry(
    "entry-recipe",
    recipeDinner.id,
    "Sheet Pan Salmon",
  );
  board.days[3].slots[2].primary = quickEntry("entry-quick", "Leftovers");
  return board;
}

function setOnline(value: boolean): void {
  Object.defineProperty(navigator, "onLine", { configurable: true, value });
}

function renderSheet(
  board: MealBoard,
  overrides: {
    onConfirm?: ReturnType<typeof vi.fn>;
    onOpenChange?: ReturnType<typeof vi.fn>;
    isSubmitting?: boolean;
  } = {},
) {
  const onConfirm = overrides.onConfirm ?? vi.fn();
  const onOpenChange = overrides.onOpenChange ?? vi.fn();
  return {
    onConfirm,
    onOpenChange,
    ...renderWithUser(
      <AddIngredientsSheet
        isOpen
        board={board}
        onOpenChange={onOpenChange}
        onConfirm={onConfirm}
        isSubmitting={overrides.isSubmitting}
      />,
    ),
  };
}

describe("AddIngredientsSheet", () => {
  setupMswServer();

  beforeEach(() => {
    setOnline(true);
    seedMockRecipes([recipeDinner]);
  });

  it("groups verbatim ingredient rows by meal and lists quick meals under 'No recipe ingredients'", async () => {
    renderSheet(boardWithRecipeAndQuick());

    // Recipe group header for the Monday dinner recipe meal.
    expect(
      await screen.findByText(/Monday · Dinner — Sheet Pan Salmon/),
    ).toBeInTheDocument();

    // Verbatim ingredient rows appear as editable inputs.
    expect(screen.getByDisplayValue("Salmon fillets")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Asparagus")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Lemon")).toBeInTheDocument();

    // The quick meal appears under the "No recipe ingredients" heading with an Add item control.
    expect(screen.getByText("No recipe ingredients")).toBeInTheDocument();
    expect(
      screen.getByText(/Wednesday · Dinner — Leftovers/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /add item/i }),
    ).toBeInTheDocument();
  });

  it("edits and removes rows before append", async () => {
    const { user, onConfirm } = renderSheet(boardWithRecipeAndQuick());

    const salmon = await screen.findByDisplayValue("Salmon fillets");
    await user.clear(salmon);
    await user.type(salmon, "2 salmon fillets");

    // Remove the "Asparagus" row.
    const asparagusRow = screen
      .getByDisplayValue("Asparagus")
      .closest("li") as HTMLElement;
    await user.click(
      within(asparagusRow).getByRole("button", { name: /remove/i }),
    );

    await user.click(screen.getByRole("button", { name: /add to list/i }));

    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
    const request = onConfirm.mock.calls[0][0];
    const texts = request.items.map((i: { text: string }) => i.text);
    expect(texts).toContain("2 salmon fillets");
    expect(texts).toContain("Lemon");
    expect(texts).not.toContain("Asparagus");
    expect(texts).not.toContain("Salmon fillets");
  });

  it("deselects a row so it is excluded from the append", async () => {
    const { user, onConfirm } = renderSheet(boardWithRecipeAndQuick());

    const lemonRow = (await screen.findByDisplayValue("Lemon")).closest(
      "li",
    ) as HTMLElement;
    await user.click(within(lemonRow).getByRole("checkbox"));

    await user.click(screen.getByRole("button", { name: /add to list/i }));

    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
    const texts = onConfirm.mock.calls[0][0].items.map(
      (i: { text: string }) => i.text,
    );
    expect(texts).not.toContain("Lemon");
    expect(texts).toContain("Salmon fillets");
  });

  it("does not auto-generate rows for quick meals", async () => {
    const { user, onConfirm } = renderSheet(boardWithRecipeAndQuick());

    // Wait for resolution; the quick meal contributes no row until Add item.
    await screen.findByDisplayValue("Salmon fillets");
    expect(screen.queryByDisplayValue("Leftovers")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /add to list/i }));

    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
    const texts = onConfirm.mock.calls[0][0].items.map(
      (i: { text: string }) => i.text,
    );
    // Only the 3 recipe ingredients — nothing from the quick meal.
    expect(texts).toEqual(["Salmon fillets", "Asparagus", "Lemon"]);

    // Clicking Add item appends an editable, selected manual row scoped to that meal.
    const quickRow = screen
      .getByText(/Wednesday · Dinner — Leftovers/)
      .closest("li") as HTMLElement;
    await user.click(
      within(quickRow).getByRole("button", { name: /add item/i }),
    );
    const manualInput = within(quickRow).getByRole("textbox");
    await user.type(manualInput, "Paper towels");

    await user.click(screen.getByRole("button", { name: /add to list/i }));
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(2));
    const secondTexts = onConfirm.mock.calls[1][0].items.map(
      (i: { text: string }) => i.text,
    );
    expect(secondTexts).toContain("Paper towels");
  });

  it("shows a retryable error row for a non-404 recipe fetch failure and excludes it from append", async () => {
    // Two recipe meals + one 404 recipe meal.
    const okRecipe: RecipeDetail = { ...recipeDinner, id: "recipe-ok" };
    const failRecipe: RecipeDetail = {
      ...recipeDinner,
      id: "recipe-fail",
      ingredients: ["Should not appear"],
    };
    seedMockRecipes([okRecipe, failRecipe]);
    // recipe-fail → 500 (error); recipe-missing is never seeded → 404 (missing).
    server.use(
      http.get(`${API_BASE}/recipes/recipe-fail`, () =>
        HttpResponse.json({ message: "boom" }, { status: 500 }),
      ),
    );

    const board = createEmptyMealsBoard();
    board.days[1].slots[2].primary = recipeEntry(
      "entry-ok",
      okRecipe.id,
      "Good Recipe",
    );
    board.days[2].slots[2].primary = recipeEntry(
      "entry-fail",
      failRecipe.id,
      "Broken Recipe",
    );
    board.days[3].slots[2].primary = recipeEntry(
      "entry-missing",
      "recipe-missing",
      "Deleted Recipe",
    );

    const { user, onConfirm } = renderSheet(board);

    // The good recipe resolves to verbatim rows.
    expect(
      await screen.findByDisplayValue("Salmon fillets"),
    ).toBeInTheDocument();

    // The failed recipe shows a per-meal error row with a Retry control.
    const errorRow = screen
      .getByText(/Tuesday · Dinner — Broken Recipe/)
      .closest("li") as HTMLElement;
    expect(
      within(errorRow).getByRole("button", { name: /retry/i }),
    ).toBeInTheDocument();

    // The 404 recipe is treated as "no recipe ingredients", not an error.
    expect(screen.getByText("No recipe ingredients")).toBeInTheDocument();
    expect(
      screen.getByText(/Wednesday · Dinner — Deleted Recipe/),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /add to list/i }));
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
    const texts = onConfirm.mock.calls[0][0].items.map(
      (i: { text: string }) => i.text,
    );
    expect(texts).not.toContain("Should not appear");
    expect(texts).toContain("Salmon fillets");
  });

  it("disables Add to list while offline with honest copy", async () => {
    setOnline(false);
    renderSheet(boardWithRecipeAndQuick());

    expect(
      await screen.findByDisplayValue("Salmon fillets"),
    ).toBeInTheDocument();

    const addButton = screen.getByRole("button", { name: /add to list/i });
    expect(addButton).toBeDisabled();
    expect(
      screen.getByText(
        "You're offline. Review your ingredients now and add them to your list when you're back online.",
      ),
    ).toBeInTheDocument();
  });

  it("retrying a failed recipe recovers its rows without discarding edits in other groups", async () => {
    const okRecipe: RecipeDetail = { ...recipeDinner, id: "recipe-ok" };
    const recovered: RecipeDetail = {
      ...recipeDinner,
      id: "recipe-fail",
      ingredients: ["Recovered ingredient"],
    };
    seedMockRecipes([okRecipe, recovered]);

    // recipe-fail: 500 on first fetch, then 200 (recovered detail) on retry.
    let failCount = 0;
    server.use(
      http.get(`${API_BASE}/recipes/recipe-fail`, () => {
        failCount += 1;
        if (failCount === 1) {
          return HttpResponse.json({ message: "boom" }, { status: 500 });
        }
        return HttpResponse.json({ data: recovered });
      }),
    );

    const board = createEmptyMealsBoard();
    board.days[1].slots[2].primary = recipeEntry(
      "entry-ok",
      okRecipe.id,
      "Good Recipe",
    );
    board.days[2].slots[2].primary = recipeEntry(
      "entry-fail",
      recovered.id,
      "Broken Recipe",
    );

    const { user, onConfirm } = renderSheet(board);

    // Good recipe resolves; edit one row and deselect another in ITS group.
    const salmon = await screen.findByDisplayValue("Salmon fillets");
    await user.clear(salmon);
    await user.type(salmon, "2 salmon fillets");

    const lemonRow = screen
      .getByDisplayValue("Lemon")
      .closest("li") as HTMLElement;
    await user.click(within(lemonRow).getByRole("checkbox"));

    // The other meal is in an error state; retry it.
    const errorRow = screen
      .getByText(/Tuesday · Dinner — Broken Recipe/)
      .closest("li") as HTMLElement;
    await user.click(within(errorRow).getByRole("button", { name: /retry/i }));

    // The recovered recipe's row now renders.
    expect(
      await screen.findByDisplayValue("Recovered ingredient"),
    ).toBeInTheDocument();

    // CRITICAL: the edit and deselection in the good-recipe group SURVIVED.
    expect(screen.getByDisplayValue("2 salmon fillets")).toBeInTheDocument();
    expect(
      screen.queryByDisplayValue("Salmon fillets"),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /add to list/i }));
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
    const texts = onConfirm.mock.calls[0][0].items.map(
      (i: { text: string }) => i.text,
    );
    expect(texts).toContain("2 salmon fillets");
    expect(texts).toContain("Recovered ingredient");
    // Deselected row stayed out; pre-edit text did not resurrect.
    expect(texts).not.toContain("Lemon");
    expect(texts).not.toContain("Salmon fillets");
  });

  it("renders only error rows and disables Add to list when every recipe errors", async () => {
    const failA: RecipeDetail = { ...recipeDinner, id: "fail-a" };
    const failB: RecipeDetail = { ...recipeDinner, id: "fail-b" };
    seedMockRecipes([failA, failB]);
    server.use(
      http.get(`${API_BASE}/recipes/fail-a`, () =>
        HttpResponse.json({ message: "boom" }, { status: 500 }),
      ),
      http.get(`${API_BASE}/recipes/fail-b`, () =>
        HttpResponse.json({ message: "boom" }, { status: 503 }),
      ),
    );

    const board = createEmptyMealsBoard();
    board.days[1].slots[2].primary = recipeEntry(
      "entry-a",
      failA.id,
      "Recipe A",
    );
    board.days[2].slots[2].primary = recipeEntry(
      "entry-b",
      failB.id,
      "Recipe B",
    );

    renderSheet(board);

    // Both meals surface as retryable error rows.
    expect(
      await screen.findByText(/Monday · Dinner — Recipe A/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Tuesday · Dinner — Recipe B/)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /retry/i })).toHaveLength(2);

    // No ingredient rows and no "No recipe ingredients" section.
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.queryByText("No recipe ingredients")).not.toBeInTheDocument();

    // Nothing is selectable, so Add to list is disabled.
    expect(screen.getByRole("button", { name: /add to list/i })).toBeDisabled();
  });

  it("excludes a blank manual row from the confirmed payload", async () => {
    const { user, onConfirm } = renderSheet(boardWithRecipeAndQuick());

    await screen.findByDisplayValue("Salmon fillets");

    // Add a manual row but leave it blank.
    const quickRow = screen
      .getByText(/Wednesday · Dinner — Leftovers/)
      .closest("li") as HTMLElement;
    await user.click(
      within(quickRow).getByRole("button", { name: /add item/i }),
    );
    expect(within(quickRow).getByRole("textbox")).toHaveValue("");

    await user.click(screen.getByRole("button", { name: /add to list/i }));
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
    const texts = onConfirm.mock.calls[0][0].items.map(
      (i: { text: string }) => i.text,
    );
    // Only the recipe ingredients — the blank manual row is dropped.
    expect(texts).toEqual(["Salmon fillets", "Asparagus", "Lemon"]);
  });

  it("starts a fresh review model each time the sheet opens", async () => {
    const board = boardWithRecipeAndQuick();
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();
    const { user, rerender } = renderWithUser(
      <AddIngredientsSheet
        isOpen
        board={board}
        onOpenChange={onOpenChange}
        onConfirm={onConfirm}
      />,
    );

    const salmon = await screen.findByDisplayValue("Salmon fillets");
    await user.clear(salmon);
    await user.type(salmon, "2 salmon fillets");

    const asparagusRow = screen
      .getByDisplayValue("Asparagus")
      .closest("li") as HTMLElement;
    await user.click(
      within(asparagusRow).getByRole("button", { name: /remove/i }),
    );

    expect(screen.getByDisplayValue("2 salmon fillets")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("Asparagus")).not.toBeInTheDocument();

    rerender(
      <AddIngredientsSheet
        isOpen={false}
        board={board}
        onOpenChange={onOpenChange}
        onConfirm={onConfirm}
      />,
    );
    rerender(
      <AddIngredientsSheet
        isOpen
        board={board}
        onOpenChange={onOpenChange}
        onConfirm={onConfirm}
      />,
    );

    expect(
      await screen.findByDisplayValue("Salmon fillets"),
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue("Asparagus")).toBeInTheDocument();
    expect(
      screen.queryByDisplayValue("2 salmon fillets"),
    ).not.toBeInTheDocument();
  });
});

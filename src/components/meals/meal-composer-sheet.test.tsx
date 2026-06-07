import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MealSlot, RecipeDetail } from "@/lib/types";
import { useAppStore } from "@/stores/app-store";
import {
  createEmptyMealSlot,
  createEmptyMealsBoard,
  createOccupiedMealsBoard,
  testWeekStartDate,
} from "@/test/fixtures/meals";
import {
  breakfastRecipeDetail,
  importedRecipeDetail,
  testRecipeDetail,
} from "@/test/fixtures/recipes";
import {
  getMockMealsBoard,
  seedMockMealsBoard,
  seedMockRecipes,
  setupMswServer,
} from "@/test/mocks/server";
import { renderWithUser, screen, waitFor } from "@/test/test-utils";
import { MealComposerSheet } from "./meal-composer-sheet";

function renderComposer(slot: MealSlot, onOpenChange = vi.fn()) {
  return {
    onOpenChange,
    ...renderWithUser(
      <MealComposerSheet
        isOpen
        slot={slot}
        readOnly={false}
        onOpenChange={onOpenChange}
      />,
    ),
  };
}

describe("MealComposerSheet", () => {
  setupMswServer();

  beforeEach(() => {
    vi.restoreAllMocks();
    seedMockMealsBoard(createOccupiedMealsBoard());
    seedMockRecipes([
      testRecipeDetail,
      importedRecipeDetail,
      breakfastRecipeDetail,
    ]);
  });

  it("suggests favorite and recent recipes while still allowing a quick meal", async () => {
    const dinnerSlot = createEmptyMealSlot(testWeekStartDate, 1, "dinner");
    const { user } = renderComposer(dinnerSlot);

    expect(await screen.findByText("Favorite recipes")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /select recipe: sheet pan salmon/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: /select recipe: berry yogurt parfaits/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Recent recipes")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Meal name"), "sal");

    expect(
      await screen.findByRole("button", {
        name: /select recipe: sheet pan salmon/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: /select recipe: imported tomato soup/i,
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create quick meal" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create recipe from this" }),
    ).toBeInTheDocument();
  });

  it("starts recipe creation from typed meal text", async () => {
    const dinnerSlot = createEmptyMealSlot(testWeekStartDate, 1, "dinner");
    const onOpenChange = vi.fn();
    const { user } = renderComposer(dinnerSlot, onOpenChange);

    await user.type(screen.getByLabelText("Meal name"), "Leftovers");
    await user.click(
      screen.getByRole("button", { name: "Create recipe from this" }),
    );

    expect(useAppStore.getState().activeModule).toBe("recipes");
    expect(useAppStore.getState().recipeCreationDraft).toEqual({
      requestedAtWeekStartDate: testWeekStartDate,
      dayIndex: 1,
      mealType: "dinner",
      typedTitle: "Leftovers",
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("creates a quick meal with optional image URL and note", async () => {
    const dinnerSlot = createEmptyMealSlot(testWeekStartDate, 3, "dinner");
    const onOpenChange = vi.fn();
    const { user } = renderComposer(dinnerSlot, onOpenChange);

    await user.type(screen.getByLabelText("Meal name"), "Pizza night");
    await user.type(
      screen.getByLabelText("Image URL"),
      "https://example.com/pizza.jpg",
    );
    await user.type(screen.getByLabelText("Note"), "Use the cast iron");
    await user.click(screen.getByRole("button", { name: "Create quick meal" }));

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it("prompts before placing a seeded recipe into an occupied slot", async () => {
    const occupiedDinnerSlot = {
      ...createOccupiedMealsBoard().days[1].slots[2],
      seededRecipeId: testRecipeDetail.id,
    };
    const { user } = renderComposer(occupiedDinnerSlot);

    await user.click(
      await screen.findByRole("button", { name: "Add recipe to slot" }),
    );

    expect(
      await screen.findByText("That slot already has a meal"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Replace primary" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Add as extra" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("adds a quick meal as an extra without a collision prompt in extra intent", async () => {
    const occupiedDinner = {
      ...createOccupiedMealsBoard().days[1].slots[2],
      intent: "extra" as const,
    };
    const onOpenChange = vi.fn();
    const { user } = renderComposer(occupiedDinner, onOpenChange);

    expect(screen.getByText("Add a side")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Meal name"), "Garlic Bread");
    await user.click(screen.getByRole("button", { name: "Add side" }));

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
    expect(
      screen.queryByText("That slot already has a meal"),
    ).not.toBeInTheDocument();
  });

  it("places a selected saved recipe into an empty slot", async () => {
    const lunchSlot = createEmptyMealSlot(testWeekStartDate, 3, "lunch");
    const onOpenChange = vi.fn();
    const { user } = renderComposer(lunchSlot, onOpenChange);

    await user.click(
      await screen.findByRole("button", {
        name: /select recipe: imported tomato soup/i,
      }),
    );

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it("shows all recipes in-composer without switching module or closing", async () => {
    // Seed 9 non-favorite recipes; default "Recent recipes" shows only 4, so the
    // oldest 5 are hidden until "Show all recipes" is clicked.
    const nineRecipes: RecipeDetail[] = Array.from({ length: 9 }, (_, i) => ({
      ...importedRecipeDetail,
      id: `00000000-0000-4000-8000-0000000006${String(i + 1).padStart(2, "0")}`,
      title: `Library Recipe ${i + 1}`,
      // Newer recipes have higher numbers (recipe 9 is newest, recipe 1 is oldest)
      updatedAt: `2026-01-${String(i + 1).padStart(2, "0")}T09:00:00`,
      favorite: false,
    }));
    // recipe 1 has updatedAt 2026-01-01 → oldest → NOT shown in the default top-4
    const hiddenRecipe = nineRecipes[0]; // "Library Recipe 1" — oldest

    const emptyBoard = createEmptyMealsBoard();
    seedMockMealsBoard(emptyBoard);
    seedMockRecipes(nineRecipes);

    // dayIndex 2 = Wednesday, mealType breakfast → slotIndex 0
    const breakfastSlot = createEmptyMealSlot(
      testWeekStartDate,
      2,
      "breakfast",
    );
    const onOpenChange = vi.fn();
    const { user } = renderComposer(breakfastSlot, onOpenChange);

    // Wait for recipes to load
    await screen.findByText("Recent recipes");

    // The hidden recipe (oldest) should NOT be visible in the default view
    expect(
      screen.queryByRole("button", {
        name: /select recipe: library recipe 1/i,
      }),
    ).not.toBeInTheDocument();

    // The visible recipe (newest) should be in the default view
    expect(
      screen.getByRole("button", {
        name: /select recipe: library recipe 9/i,
      }),
    ).toBeInTheDocument();

    // Click "Show all recipes"
    await user.click(screen.getByRole("button", { name: "Show all recipes" }));

    // All 9 recipes should now be present
    for (let i = 1; i <= 9; i++) {
      expect(
        screen.getByRole("button", {
          name: new RegExp(`select recipe: library recipe ${i}`, "i"),
        }),
      ).toBeInTheDocument();
    }

    // Select the previously-hidden recipe
    await user.click(
      screen.getByRole("button", {
        name: /select recipe: library recipe 1/i,
      }),
    );

    // The correct slot should have received the recipe
    await waitFor(() => {
      const board = getMockMealsBoard(testWeekStartDate);
      // dayIndex 2, breakfast = slotIndex 0
      expect(board.days[2].slots[0].primary?.recipeId).toBe(hiddenRecipe.id);
    });

    // The module should NOT have changed — still "calendar" (the test-reset default, NOT "recipes")
    expect(useAppStore.getState().activeModule).toBe("calendar");
    // The composer should have closed (upsert success fires onOpenChange(false))
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("rejects an invalid image URL with an inline error and no mutation", async () => {
    const emptyBoard = createEmptyMealsBoard();
    seedMockMealsBoard(emptyBoard);

    // dayIndex 4, dinner = slotIndex 2
    const dinnerSlot = createEmptyMealSlot(testWeekStartDate, 4, "dinner");
    const onOpenChange = vi.fn();
    const { user } = renderComposer(dinnerSlot, onOpenChange);

    await user.type(screen.getByLabelText("Meal name"), "Mystery Meal");
    await user.type(screen.getByLabelText("Image URL"), "not a url");
    await user.click(screen.getByRole("button", { name: "Create quick meal" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("valid URL");

    // No mutation: the slot stays empty and the composer stays open.
    const board = getMockMealsBoard(testWeekStartDate);
    expect(board.days[4].slots[2].primary).toBeNull();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it("saves a valid quick meal to the board", async () => {
    const emptyBoard = createEmptyMealsBoard();
    seedMockMealsBoard(emptyBoard);

    // dayIndex 5, lunch = slotIndex 1
    const lunchSlot = createEmptyMealSlot(testWeekStartDate, 5, "lunch");
    const onOpenChange = vi.fn();
    const { user } = renderComposer(lunchSlot, onOpenChange);

    await user.type(screen.getByLabelText("Meal name"), "Tacos");
    await user.type(
      screen.getByLabelText("Image URL"),
      "https://example.com/tacos.jpg",
    );
    await user.type(screen.getByLabelText("Note"), "Extra cilantro");
    await user.click(screen.getByRole("button", { name: "Create quick meal" }));

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    const board = getMockMealsBoard(testWeekStartDate);
    const slot = board.days[5].slots[1];
    expect(slot.primary?.sourceType).toBe("quick");
    expect(slot.primary?.title).toBe("Tacos");
    // Quick-meal note lives on the entry, not the slot.
    expect(slot.primary?.note).toBe("Extra cilantro");
    expect(slot.note).toBeNull();
  });

  it("carries a typed note onto the slot when placing a recipe", async () => {
    const emptyBoard = createEmptyMealsBoard();
    seedMockMealsBoard(emptyBoard);

    // dayIndex 6, dinner = slotIndex 2
    const dinnerSlot = createEmptyMealSlot(testWeekStartDate, 6, "dinner");
    const onOpenChange = vi.fn();
    const { user } = renderComposer(dinnerSlot, onOpenChange);

    await user.type(screen.getByLabelText("Note"), "Double the sauce");

    await user.click(
      await screen.findByRole("button", {
        name: /select recipe: imported tomato soup/i,
      }),
    );

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    const board = getMockMealsBoard(testWeekStartDate);
    const slot = board.days[6].slots[2];
    // The user's meal-planning note belongs to the slot, not the recipe entry.
    expect(slot.note).toBe("Double the sauce");
    expect(slot.primary?.sourceType).toBe("recipe");
    expect(slot.primary?.recipeId).toBe(importedRecipeDetail.id);
  });

  it("shows recent recipes sorted newest-first when there is no query", async () => {
    const olderRecipe: RecipeDetail = {
      ...importedRecipeDetail,
      id: "00000000-0000-4000-8000-000000000510",
      title: "Older Non-Favorite",
      updatedAt: "2026-05-01T09:00:00",
      favorite: false,
    };
    const newerRecipe: RecipeDetail = {
      ...importedRecipeDetail,
      id: "00000000-0000-4000-8000-000000000511",
      title: "Newer Non-Favorite",
      updatedAt: "2026-06-03T09:00:00",
      favorite: false,
    };
    seedMockRecipes([olderRecipe, newerRecipe]);

    const lunchSlot = createEmptyMealSlot(testWeekStartDate, 0, "lunch");
    renderComposer(lunchSlot);

    await screen.findByText("Recent recipes");

    const buttons = screen.getAllByRole("button", { name: /select recipe:/i });
    const labels = buttons.map((b) => b.getAttribute("aria-label") ?? "");
    const newerIdx = labels.findIndex((l) => l.includes("Newer Non-Favorite"));
    const olderIdx = labels.findIndex((l) => l.includes("Older Non-Favorite"));
    expect(newerIdx).toBeGreaterThanOrEqual(0);
    expect(olderIdx).toBeGreaterThanOrEqual(0);
    expect(newerIdx).toBeLessThan(olderIdx);
  });
});

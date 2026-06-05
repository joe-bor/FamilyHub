import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MealSlot } from "@/lib/types";
import { useAppStore } from "@/stores/app-store";
import {
  createEmptyMealSlot,
  createOccupiedMealsBoard,
  testWeekStartDate,
} from "@/test/fixtures/meals";
import {
  breakfastRecipeDetail,
  importedRecipeDetail,
  testRecipeDetail,
} from "@/test/fixtures/recipes";
import {
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

  it("offers entry into the full recipe library", async () => {
    const lunchSlot = createEmptyMealSlot(testWeekStartDate, 3, "lunch");
    const { user } = renderComposer(lunchSlot);

    await user.click(
      screen.getByRole("button", { name: "Browse recipe library" }),
    );

    expect(useAppStore.getState().activeModule).toBe("recipes");
  });
});

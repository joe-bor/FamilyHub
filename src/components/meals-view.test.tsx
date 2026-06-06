import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatLocalDate, getWeekStartSunday } from "@/lib/time-utils";
import { useAppStore } from "@/stores/app-store";
import {
  createEmptyMealsBoard,
  createOccupiedMealsBoard,
  createRecipeBackedMealsBoard,
  testWeekStartDate,
} from "@/test/fixtures/meals";
import { testRecipeDetail } from "@/test/fixtures/recipes";
import {
  getMockMealsBoard,
  seedMockMealsBoard,
  seedMockRecipes,
  setupMswServer,
} from "@/test/mocks/server";
import { renderWithUser, screen, waitFor } from "@/test/test-utils";
import { MealEditorSheet } from "./meals/meal-editor-sheet";
import { MealsView } from "./meals-view";

const viewport = vi.hoisted(() => ({ showGrid: false }));

vi.mock("@/hooks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/hooks")>();
  return {
    ...actual,
    useMediaQuery: () => viewport.showGrid,
  };
});

function mockCurrentWeek() {
  const fixedNow = new Date(2026, 5, 10, 9, 15, 0);
  const RealDate = Date;
  class MockDate extends RealDate {
    constructor(...args: ConstructorParameters<DateConstructor>) {
      if (args.length === 0) {
        super(fixedNow);
        return;
      }

      super(...(args as ConstructorParameters<typeof RealDate>));
    }

    static now() {
      return fixedNow.getTime();
    }
  }

  vi.stubGlobal("Date", MockDate as DateConstructor);
}

describe("MealsView", () => {
  setupMswServer();

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    viewport.showGrid = false;
    mockCurrentWeek();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows add affordances for empty breakfast, lunch, and dinner slots", async () => {
    seedMockMealsBoard(createEmptyMealsBoard());

    renderWithUser(<MealsView />);

    expect(
      await screen.findByRole("heading", { name: "Meals" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Jun 7 - Jun 13")).toBeInTheDocument();
    expect(
      await screen.findAllByRole("button", { name: /add .*meal/i }),
    ).toHaveLength(21);
    expect(
      screen.getAllByRole("button", { name: /add breakfast/i }),
    ).toHaveLength(7);
    expect(screen.getAllByRole("button", { name: /add lunch/i })).toHaveLength(
      7,
    );
    expect(screen.getAllByRole("button", { name: /add dinner/i })).toHaveLength(
      7,
    );
  });

  it("creates a quick meal from an empty slot", async () => {
    seedMockMealsBoard(createEmptyMealsBoard());
    const { user } = renderWithUser(<MealsView />);

    const dinnerButtons = await screen.findAllByRole("button", {
      name: /add dinner/i,
    });
    await user.click(dinnerButtons[0]);
    await user.type(screen.getByLabelText("Meal name"), "Leftovers");
    await user.click(screen.getByRole("button", { name: "Create quick meal" }));

    await waitFor(() => {
      expect(
        getMockMealsBoard(testWeekStartDate).days[0].slots[2].primary?.title,
      ).toBe("Leftovers");
    });
    expect(
      screen.queryByRole("dialog", { name: /plan dinner/i }),
    ).not.toBeInTheDocument();
  });

  it("consumes a recipe placement draft and places the recipe into a selected empty slot", async () => {
    seedMockMealsBoard(createEmptyMealsBoard());
    seedMockRecipes([testRecipeDetail]);
    useAppStore.getState().startMealPlacementFromRecipe({
      recipeId: testRecipeDetail.id,
      requestedAtWeekStartDate: testWeekStartDate,
      source: { kind: "recipes-library" },
    });

    const { user } = renderWithUser(<MealsView />);

    expect(
      await screen.findByText(
        `Choose a meal slot for ${testRecipeDetail.title}`,
      ),
    ).toBeInTheDocument();
    expect(useAppStore.getState().mealPlacementDraft).toBe(null);

    await user.click(
      screen.getAllByRole("button", { name: /add recipe to dinner/i })[0],
    );
    await user.click(
      screen.getByRole("button", { name: "Add recipe to slot" }),
    );

    await waitFor(() => {
      expect(
        getMockMealsBoard(testWeekStartDate).days[0].slots[2].primary,
      ).toMatchObject({
        sourceType: "recipe",
        recipeId: testRecipeDetail.id,
        title: testRecipeDetail.title,
      });
    });
  });

  it("keeps the recipe placement draft when navigating to another week", async () => {
    seedMockMealsBoard(createEmptyMealsBoard());
    seedMockMealsBoard(createEmptyMealsBoard("2026-06-14"));
    seedMockRecipes([testRecipeDetail]);
    useAppStore.getState().startMealPlacementFromRecipe({
      recipeId: testRecipeDetail.id,
      requestedAtWeekStartDate: testWeekStartDate,
      source: { kind: "recipes-library" },
    });

    const { user } = renderWithUser(<MealsView />);

    expect(
      await screen.findByText(
        `Choose a meal slot for ${testRecipeDetail.title}`,
      ),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Next week" }));

    expect(await screen.findByText("Jun 14 - Jun 20")).toBeInTheDocument();
    expect(
      screen.getByText(`Choose a meal slot for ${testRecipeDetail.title}`),
    ).toBeInTheDocument();
    expect(
      (
        await screen.findAllByRole("button", { name: /add recipe to dinner/i })
      )[0],
    ).toBeInTheDocument();
  });

  it("makes past weeks review-only through normal board interactions", async () => {
    seedMockMealsBoard(createEmptyMealsBoard("2026-05-31"));
    const { user } = renderWithUser(<MealsView />);

    await user.click(
      await screen.findByRole("button", { name: "Previous week" }),
    );

    expect(await screen.findByText("Review only")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /add meal/i }),
    ).not.toBeInTheDocument();
  });

  it("starts the board on the local Sunday for the current week", async () => {
    seedMockMealsBoard(createEmptyMealsBoard());

    renderWithUser(<MealsView />);

    expect(formatLocalDate(getWeekStartSunday(new Date()))).toBe(
      testWeekStartDate,
    );
    expect(await screen.findByText("Jun 7 - Jun 13")).toBeInTheDocument();
  });

  it("keeps current and future weeks editable", async () => {
    seedMockMealsBoard(createEmptyMealsBoard());
    const { user } = renderWithUser(<MealsView />);

    expect(
      (await screen.findAllByRole("button", { name: /add dinner/i }))[0],
    ).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Next week" }));

    expect(await screen.findByText("Jun 14 - Jun 20")).toBeInTheDocument();
    expect(
      (await screen.findAllByRole("button", { name: /add dinner/i }))[0],
    ).toBeEnabled();
  });

  it("renders occupied slots as meal cards rather than add affordances", async () => {
    seedMockMealsBoard(createOccupiedMealsBoard());

    renderWithUser(<MealsView />);

    expect(
      await screen.findByRole("button", { name: /open dinner: pasta/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Salad")).toBeInTheDocument();
  });

  it("renders day cards (not a hidden grid) below the lg breakpoint", async () => {
    seedMockMealsBoard(createEmptyMealsBoard());

    renderWithUser(<MealsView />);

    expect(
      await screen.findAllByRole("button", { name: /add dinner/i }),
    ).toHaveLength(7);
    expect(
      screen.queryByRole("table", { name: "Weekly meals" }),
    ).not.toBeInTheDocument();
  });

  it("renders a weekly meals grid on larger screens", async () => {
    viewport.showGrid = true;
    seedMockMealsBoard(createEmptyMealsBoard());

    renderWithUser(<MealsView />);

    expect(
      await screen.findByRole("table", { name: "Weekly meals" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("rowheader", { name: "Breakfast" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Sunday" }),
    ).toBeInTheDocument();
  });

  it("prompts when moving into an occupied slot and move clears the source", async () => {
    const board = createOccupiedMealsBoard();
    seedMockMealsBoard(board);
    const { user } = renderWithUser(
      <MealEditorSheet
        isOpen
        slot={board.days[1].slots[2]}
        board={board}
        readOnly={false}
        onOpenChange={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Move meal" }));
    await user.click(screen.getByRole("button", { name: "Move here" }));

    expect(
      await screen.findByText("That slot already has a meal"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Replace primary" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Add as extra" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Replace primary" }));

    await waitFor(() => {
      const updatedBoard = getMockMealsBoard(testWeekStartDate);
      expect(updatedBoard.days[1].slots[2].primary).toBe(null);
      expect(updatedBoard.days[2].slots[2].primary?.title).toBe("Pasta");
    });
  });

  it("duplicates explicitly and can add the duplicate as an extra on collision", async () => {
    const board = createOccupiedMealsBoard();
    seedMockMealsBoard(board);
    const { user } = renderWithUser(
      <MealEditorSheet
        isOpen
        slot={board.days[1].slots[2]}
        board={board}
        readOnly={false}
        onOpenChange={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Duplicate meal" }));
    await user.click(screen.getByRole("button", { name: "Duplicate here" }));
    expect(
      await screen.findByText("That slot already has a meal"),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Add as extra" }));

    await waitFor(() => {
      const updatedBoard = getMockMealsBoard(testWeekStartDate);
      expect(updatedBoard.days[1].slots[2].primary?.title).toBe("Pasta");
      expect(updatedBoard.days[2].slots[2].primary?.title).toBe("Soup");
      expect(
        updatedBoard.days[2].slots[2].extras.map((extra) => extra.title),
      ).toEqual(["Pasta", "Salad"]);
    });
  });

  it("removes a planned meal from the editor", async () => {
    const board = createOccupiedMealsBoard();
    seedMockMealsBoard(board);
    const { user } = renderWithUser(
      <MealEditorSheet
        isOpen
        slot={board.days[1].slots[2]}
        board={board}
        readOnly={false}
        onOpenChange={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Remove meal" }));

    await waitFor(() => {
      expect(
        getMockMealsBoard(testWeekStartDate).days[1].slots[2].primary,
      ).toBe(null);
    });
  });

  it("edits the slot note from the editor", async () => {
    const board = createOccupiedMealsBoard();
    seedMockMealsBoard(board);
    const { user } = renderWithUser(
      <MealEditorSheet
        isOpen
        slot={board.days[1].slots[2]}
        board={board}
        readOnly={false}
        onOpenChange={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Add meal note" }));
    await user.type(screen.getByLabelText("Meal note"), "Family favorite");
    await user.click(screen.getByRole("button", { name: "Save note" }));

    await waitFor(() => {
      expect(getMockMealsBoard(testWeekStartDate).days[1].slots[2].note).toBe(
        "Family favorite",
      );
    });
  });

  it("removes an extra from the editor", async () => {
    const board = createOccupiedMealsBoard();
    seedMockMealsBoard(board);
    const { user } = renderWithUser(
      <MealEditorSheet
        isOpen
        slot={board.days[1].slots[2]}
        board={board}
        readOnly={false}
        onOpenChange={vi.fn()}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Remove extra: Salad" }),
    );

    await waitFor(() => {
      expect(
        getMockMealsBoard(testWeekStartDate).days[1].slots[2].extras,
      ).toHaveLength(0);
    });
    expect(
      getMockMealsBoard(testWeekStartDate).days[1].slots[2].primary?.title,
    ).toBe("Pasta");
  });

  it("invokes replace and add-extra callbacks from the editor", async () => {
    const board = createOccupiedMealsBoard();
    seedMockMealsBoard(board);
    const onReplace = vi.fn();
    const onAddExtra = vi.fn();
    const { user } = renderWithUser(
      <MealEditorSheet
        isOpen
        slot={board.days[1].slots[2]}
        board={board}
        readOnly={false}
        onReplace={onReplace}
        onAddExtra={onAddExtra}
        onOpenChange={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Replace meal" }));
    expect(onReplace).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Add extra or side" }));
    expect(onAddExtra).toHaveBeenCalledTimes(1);
  });

  it("opens the composer to replace an occupied slot", async () => {
    seedMockMealsBoard(createOccupiedMealsBoard());
    const { user } = renderWithUser(<MealsView />);

    await user.click(
      await screen.findByRole("button", { name: /open dinner: pasta/i }),
    );
    await user.click(screen.getByRole("button", { name: "Replace meal" }));

    await user.type(screen.getByLabelText("Meal name"), "Tacos");
    await user.click(screen.getByRole("button", { name: "Create quick meal" }));
    await user.click(screen.getByRole("button", { name: "Replace primary" }));

    await waitFor(() => {
      expect(
        getMockMealsBoard(testWeekStartDate).days[1].slots[2].primary?.title,
      ).toBe("Tacos");
    });
  });

  it("opens the live recipe detail from a recipe-backed planned meal", async () => {
    const board = createRecipeBackedMealsBoard();
    seedMockMealsBoard(board);
    seedMockRecipes([testRecipeDetail]);
    const { user } = renderWithUser(
      <MealEditorSheet
        isOpen
        slot={board.days[1].slots[2]}
        board={board}
        readOnly={false}
        onOpenChange={vi.fn()}
      />,
    );

    expect(screen.getByText("Snapshot Salmon")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "View recipe" }));

    expect(
      await screen.findByRole("heading", { name: testRecipeDetail.title }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Ingredients" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Instructions" }),
    ).toBeInTheDocument();
  });

  it("moves a planned meal to a chosen day and meal type", async () => {
    const board = createOccupiedMealsBoard(); // Monday dinner: Pasta + Salad
    seedMockMealsBoard(board);
    const { user } = renderWithUser(
      <MealEditorSheet
        isOpen
        slot={board.days[1].slots[2]}
        board={board}
        readOnly={false}
        onOpenChange={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Move meal" }));
    await user.selectOptions(screen.getByLabelText("Day"), "4"); // Thursday
    await user.selectOptions(screen.getByLabelText("Meal"), "lunch");
    await user.click(screen.getByRole("button", { name: "Move here" }));

    await waitFor(() => {
      const updated = getMockMealsBoard(testWeekStartDate);
      expect(updated.days[1].slots[2].primary).toBe(null);
      expect(updated.days[4].slots[1].primary?.title).toBe("Pasta");
      expect(
        updated.days[4].slots[1].extras.map((extra) => extra.title),
      ).toEqual(["Salad"]);
    });
  });
});

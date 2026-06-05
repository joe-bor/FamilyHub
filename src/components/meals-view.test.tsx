import { beforeEach, describe, expect, it, vi } from "vitest";
import { formatLocalDate, getWeekStartSunday } from "@/lib/time-utils";
import { useAppStore } from "@/stores/app-store";
import {
  createEmptyMealsBoard,
  createOccupiedMealsBoard,
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
import { MealsView } from "./meals-view";

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
    mockCurrentWeek();
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
});

import { QueryClient } from "@tanstack/react-query";
import { HttpResponse, http } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mealsKeys } from "@/api";
import { formatLocalDate, getWeekStartSunday } from "@/lib/time-utils";
import type {
  ApiResponse,
  ListDetail,
  MealBoard,
  SaveMealPlanRequest,
} from "@/lib/types";
import { IDLE_BLOCKER_MEALS_FLOW, useAppStore } from "@/stores/app-store";
import {
  createEmptyMealsBoard,
  createExtrasOnlyMealsBoard,
  createOccupiedMealsBoard,
  createRecipeBackedMealsBoard,
  testWeekStartDate,
} from "@/test/fixtures/meals";
import {
  importedRecipeDetail,
  testRecipeDetail,
} from "@/test/fixtures/recipes";
import {
  API_BASE,
  getMockMealsBoard,
  seedMockLists,
  seedMockMealsBoard,
  seedMockRecipes,
  server,
  setupMswServer,
} from "@/test/mocks/server";
import { renderWithUser, screen, waitFor, within } from "@/test/test-utils";
import { MealEditorSheet } from "./meals/meal-editor-sheet";
import { MealsView } from "./meals-view";

const viewport = vi.hoisted(() => ({ showGrid: false }));

vi.mock("@/hooks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/hooks")>();
  return {
    ...actual,
    useMediaQuery: () => viewport.showGrid,
    useIsLargeScreen: () => viewport.showGrid,
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

function withOccupiedMealSlot(
  board: MealBoard,
  dayIndex: number,
  mealType: SaveMealPlanRequest["slots"][number]["mealType"],
  title: string,
): MealBoard {
  return {
    ...board,
    days: board.days.map((day) =>
      day.dayIndex === dayIndex
        ? {
            ...day,
            slots: day.slots.map((slot) =>
              slot.mealType === mealType
                ? {
                    ...slot,
                    id: `slot-${dayIndex}-${mealType}`,
                    primary: {
                      id: `entry-${dayIndex}-${mealType}`,
                      role: "primary",
                      sourceType: "quick",
                      recipeId: null,
                      title,
                      imageUrl: null,
                      note: null,
                    },
                    extras: [],
                    note: null,
                  }
                : slot,
            ),
          }
        : day,
    ),
  };
}

function withOccupiedDinnerSlot(
  board: MealBoard,
  dayIndex: number,
  title: string,
): MealBoard {
  return withOccupiedMealSlot(board, dayIndex, "dinner", title);
}

function withExtrasOnlyDinnerSlot(
  board: MealBoard,
  dayIndex: number,
  extraTitle: string,
): MealBoard {
  return {
    ...board,
    days: board.days.map((day) =>
      day.dayIndex === dayIndex
        ? {
            ...day,
            slots: day.slots.map((slot) =>
              slot.mealType === "dinner"
                ? {
                    ...slot,
                    id: `slot-${dayIndex}-dinner-extras`,
                    primary: null,
                    extras: [
                      {
                        id: `entry-${dayIndex}-dinner-extra`,
                        role: "extra",
                        sourceType: "quick",
                        recipeId: null,
                        title: extraTitle,
                        imageUrl: null,
                        note: null,
                      },
                    ],
                    note: null,
                  }
                : slot,
            ),
          }
        : day,
    ),
  };
}

function setNavigatorOnline(value: boolean): void {
  Object.defineProperty(navigator, "onLine", {
    configurable: true,
    value,
  });
  window.dispatchEvent(new Event(value ? "online" : "offline"));
}

function withSavedMealPlan(
  board: MealBoard,
  request: SaveMealPlanRequest,
): MealBoard {
  return request.slots.reduce(
    (nextBoard, slot) =>
      withOccupiedMealSlot(
        nextBoard,
        slot.dayIndex,
        slot.mealType,
        slot.primary.title ?? "Recipe meal",
      ),
    board,
  );
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
    setNavigatorOnline(true);
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

  it("blocks large-screen idle return while a meal flow is active", async () => {
    seedMockMealsBoard(createEmptyMealsBoard());
    const { user } = renderWithUser(<MealsView />);

    const dinnerButtons = await screen.findAllByRole("button", {
      name: /add dinner/i,
    });
    await user.click(dinnerButtons[0]);

    expect(useAppStore.getState().idleReturnBlockers).toEqual({
      [IDLE_BLOCKER_MEALS_FLOW]: true,
    });
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

  it("treats extras-only dinner slots as existing context and opens the editor", async () => {
    seedMockMealsBoard(createExtrasOnlyMealsBoard());
    const { user } = renderWithUser(<MealsView />);

    const dayHeading = await screen.findByRole("heading", {
      name: "Thursday, Jun 11",
    });
    const daySection = dayHeading.closest("section");
    expect(daySection).not.toBeNull();
    const thursday = within(daySection as HTMLElement);

    const extrasButton = thursday.getByRole("button", {
      name: /open dinner: extras - garlic bread/i,
    });
    expect(
      thursday.queryByRole("button", { name: "Add dinner meal" }),
    ).not.toBeInTheDocument();
    expect(thursday.getByText("Garlic bread")).toBeInTheDocument();

    await user.click(extrasButton);

    const editorDialog = await screen.findByRole("dialog", {
      name: "Dinner Plan",
    });
    expect(within(editorDialog).getByText("Garlic bread")).toBeInTheDocument();
    expect(
      within(editorDialog).getByRole("button", { name: "Add extra or side" }),
    ).toBeDisabled();
    expect(
      within(editorDialog).getByRole("button", { name: "Move meal" }),
    ).toBeDisabled();
    expect(
      within(editorDialog).getByRole("button", { name: "Duplicate meal" }),
    ).toBeDisabled();
    expect(
      within(editorDialog).queryByRole("button", {
        name: /remove extra:/i,
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("dialog", { name: "Plan Dinner" }),
    ).not.toBeInTheDocument();
  });

  it("adds a primary meal to an extras-only slot while preserving extras", async () => {
    seedMockMealsBoard(createExtrasOnlyMealsBoard());
    const { user } = renderWithUser(<MealsView />);

    const dayHeading = await screen.findByRole("heading", {
      name: "Thursday, Jun 11",
    });
    const daySection = dayHeading.closest("section");
    expect(daySection).not.toBeNull();
    const thursday = within(daySection as HTMLElement);

    await user.click(
      thursday.getByRole("button", {
        name: /open dinner: extras - garlic bread/i,
      }),
    );
    await user.click(screen.getByRole("button", { name: "Replace meal" }));

    const composerDialog = await screen.findByRole("dialog", {
      name: "Plan Dinner",
    });
    await user.type(within(composerDialog).getByLabelText("Meal name"), "Soup");
    await user.click(
      within(composerDialog).getByRole("button", {
        name: "Create quick meal",
      }),
    );

    await waitFor(() => {
      const dinner = getMockMealsBoard(testWeekStartDate).days[4].slots[2];
      expect(dinner.primary?.title).toBe("Soup");
      expect(dinner.extras.map((extra) => extra.title)).toEqual([
        "Garlic bread",
      ]);
    });
  });

  it("shows Fill empty slots on editable weeks and hides it on past weeks", async () => {
    seedMockMealsBoard(createEmptyMealsBoard());
    seedMockMealsBoard(createEmptyMealsBoard("2026-06-14"));
    seedMockMealsBoard(createEmptyMealsBoard("2026-05-31"));
    const { user } = renderWithUser(<MealsView />);

    expect(
      await screen.findByRole("button", { name: "Fill empty slots" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Next week" }));
    expect(await screen.findByText("Jun 14 - Jun 20")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Fill empty slots" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Previous week" }));
    await user.click(screen.getByRole("button", { name: "Previous week" }));
    expect(await screen.findByText("Review only")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Fill empty slots" }),
    ).not.toBeInTheDocument();
  });

  it("starts empty-dinners planning and projects a quick draft without saving", async () => {
    seedMockMealsBoard(createEmptyMealsBoard());
    const { user } = renderWithUser(<MealsView />);

    await user.click(
      await screen.findByRole("button", { name: "Fill empty slots" }),
    );
    expect(
      await screen.findByRole("dialog", { name: /fill empty slots/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Empty dinners")).toBeChecked();

    await user.click(screen.getByRole("button", { name: "Start planning" }));

    expect(
      await screen.findByRole("dialog", { name: "Meal planning" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Sunday dinner - 1 of 7")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Meal name"), "Chili");
    await user.click(
      screen.getByRole("button", { name: "Add quick meal draft" }),
    );

    expect(
      await screen.findByRole("button", {
        name: "Draft dinner: Chili",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Monday dinner - 2 of 7")).toBeInTheDocument();
    expect(getMockMealsBoard(testWeekStartDate).days[0].slots[2].primary).toBe(
      null,
    );
  });

  it("cancel planning discards local drafts without mutating the persisted board", async () => {
    seedMockMealsBoard(createEmptyMealsBoard());
    const { user } = renderWithUser(<MealsView />);

    await user.click(
      await screen.findByRole("button", { name: "Fill empty slots" }),
    );
    await user.click(screen.getByRole("button", { name: "Start planning" }));
    await user.type(await screen.findByLabelText("Meal name"), "Chili");
    await user.click(
      screen.getByRole("button", { name: "Add quick meal draft" }),
    );
    expect(
      await screen.findByRole("button", {
        name: "Draft dinner: Chili",
      }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancel planning" }));

    expect(
      screen.queryByRole("dialog", { name: "Meal planning" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: "Draft dinner: Chili",
      }),
    ).not.toBeInTheDocument();
    expect(getMockMealsBoard(testWeekStartDate).days[0].slots[2].primary).toBe(
      null,
    );
  });

  it("selected-days scope queues only Monday and Wednesday empty slots", async () => {
    seedMockMealsBoard(createEmptyMealsBoard());
    const { user } = renderWithUser(<MealsView />);

    await user.click(
      await screen.findByRole("button", { name: "Fill empty slots" }),
    );
    await user.click(screen.getByLabelText("Selected days"));

    const startButton = screen.getByRole("button", { name: "Start planning" });
    expect(startButton).toBeDisabled();

    await user.click(screen.getByLabelText("Monday"));
    await user.click(screen.getByLabelText("Wednesday"));
    expect(startButton).toBeEnabled();
    await user.click(startButton);

    expect(
      await screen.findByRole("dialog", { name: "Meal planning" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Monday breakfast - 1 of 6")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Skip this slot" }));
    expect(screen.getByText("Monday lunch - 2 of 6")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Skip this slot" }));
    expect(screen.getByText("Monday dinner - 3 of 6")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Skip this slot" }));
    expect(
      screen.getByText("Wednesday breakfast - 4 of 6"),
    ).toBeInTheDocument();
  });

  it("starts planning from a blank future week without leaving Meals", async () => {
    seedMockMealsBoard(createEmptyMealsBoard());
    const { user } = renderWithUser(<MealsView />);

    await user.click(await screen.findByRole("button", { name: "Next week" }));
    expect(await screen.findByText("Jun 14 - Jun 20")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Fill empty slots" }));
    await user.click(screen.getByRole("button", { name: "Start planning" }));

    expect(
      await screen.findByRole("dialog", { name: "Meal planning" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Sunday dinner - 1 of 7")).toBeInTheDocument();
    expect(screen.getByText("Jun 14 - Jun 20")).toBeInTheDocument();
  });

  it("projects a recipe-backed draft from candidates without saving early", async () => {
    seedMockMealsBoard(createEmptyMealsBoard());
    seedMockRecipes([testRecipeDetail, importedRecipeDetail]);
    const { user } = renderWithUser(<MealsView />);

    await user.click(
      await screen.findByRole("button", { name: "Fill empty slots" }),
    );
    await user.click(screen.getByRole("button", { name: "Start planning" }));
    await user.click(
      await screen.findByRole("button", {
        name: `Select recipe: ${testRecipeDetail.title}`,
      }),
    );

    expect(
      await screen.findByRole("button", {
        name: `Draft dinner: ${testRecipeDetail.title}`,
      }),
    ).toBeInTheDocument();
    expect(getMockMealsBoard(testWeekStartDate).days[0].slots[2].primary).toBe(
      null,
    );
  });

  it("skip, remove draft, and change draft update planning state without saving", async () => {
    seedMockMealsBoard(createEmptyMealsBoard());
    const { user } = renderWithUser(<MealsView />);

    await user.click(
      await screen.findByRole("button", { name: "Fill empty slots" }),
    );
    await user.click(screen.getByRole("button", { name: "Start planning" }));

    await user.click(screen.getByRole("button", { name: "Skip this slot" }));
    expect(screen.getByText("Monday dinner - 2 of 7")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Meal name"), "Tacos");
    await user.click(
      screen.getByRole("button", { name: "Add quick meal draft" }),
    );
    expect(
      await screen.findByRole("button", {
        name: "Draft dinner: Tacos",
      }),
    ).toBeInTheDocument();
    expect(getMockMealsBoard(testWeekStartDate).days[1].slots[2].primary).toBe(
      null,
    );

    await user.click(screen.getByRole("button", { name: "Review plan" }));
    expect(screen.getByText("1 meals ready to add")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Change draft" }));
    expect(screen.getByText("Monday dinner - 2 of 7")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Remove draft: Tacos" }),
    );
    expect(
      screen.queryByRole("button", {
        name: "Draft dinner: Tacos",
      }),
    ).not.toBeInTheDocument();
    expect(getMockMealsBoard(testWeekStartDate).days[1].slots[2].primary).toBe(
      null,
    );
  });

  it("keeps conflict editing focused on the conflicted draft", async () => {
    seedMockMealsBoard(createEmptyMealsBoard());
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: Infinity, staleTime: 0 },
        mutations: { retry: false },
      },
    });
    const { user } = renderWithUser(<MealsView />, { queryClient });

    await user.click(
      await screen.findByRole("button", { name: "Fill empty slots" }),
    );
    await user.click(screen.getByRole("button", { name: "Start planning" }));
    await user.type(screen.getByLabelText("Meal name"), "Chili");
    await user.click(
      screen.getByRole("button", { name: "Add quick meal draft" }),
    );
    expect(
      await screen.findByRole("button", { name: "Draft dinner: Chili" }),
    ).toBeInTheDocument();

    seedMockMealsBoard(
      withOccupiedDinnerSlot(createEmptyMealsBoard(), 0, "Already planned"),
    );
    await queryClient.invalidateQueries({
      queryKey: mealsKeys.board(testWeekStartDate),
    });
    await waitFor(() => {
      const cached = queryClient.getQueryData<ApiResponse<MealBoard>>(
        mealsKeys.board(testWeekStartDate),
      );
      expect(cached?.data.days[0].slots[2].primary?.title).toBe(
        "Already planned",
      );
    });

    await user.click(screen.getByRole("button", { name: "Review plan" }));
    await user.click(screen.getByRole("button", { name: "Save to week" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Some meal slots are no longer empty.",
    );

    await user.click(
      screen.getAllByRole("button", { name: "Keep editing" })[0],
    );

    expect(screen.getByText("Sunday dinner - 1 of 7")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Draft dinner: Chili" }),
    ).toHaveAttribute("aria-current", "true");
  });

  it("saves drafted meals to the week with one batch request", async () => {
    seedMockMealsBoard(createEmptyMealsBoard());
    const saveRequests: Array<{
      pathname: string;
      body: SaveMealPlanRequest;
    }> = [];
    let singleSlotSaveCalls = 0;
    server.use(
      http.post(`${API_BASE}/meals/plans`, async ({ request }) => {
        const body = (await request.json()) as SaveMealPlanRequest;
        saveRequests.push({
          pathname: new URL(request.url).pathname,
          body,
        });
        const savedBoard = withSavedMealPlan(
          getMockMealsBoard(body.weekStartDate),
          body,
        );
        seedMockMealsBoard(savedBoard);
        return HttpResponse.json({ data: savedBoard });
      }),
      http.put(`${API_BASE}/meals/slots`, () => {
        singleSlotSaveCalls += 1;
        return HttpResponse.json(
          { message: "single-slot save should not be used" },
          { status: 500 },
        );
      }),
    );
    const { user } = renderWithUser(<MealsView />);

    await user.click(
      await screen.findByRole("button", { name: "Fill empty slots" }),
    );
    await user.click(screen.getByRole("button", { name: "Start planning" }));
    await user.type(screen.getByLabelText("Meal name"), "Chili");
    await user.click(
      screen.getByRole("button", { name: "Add quick meal draft" }),
    );
    expect(screen.getByText("Monday dinner - 2 of 7")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Meal name"), "Tacos");
    await user.click(
      screen.getByRole("button", { name: "Add quick meal draft" }),
    );
    await user.click(screen.getByRole("button", { name: "Review plan" }));
    await user.click(screen.getByRole("button", { name: "Save to week" }));

    await waitFor(() => {
      expect(
        getMockMealsBoard(testWeekStartDate).days[0].slots[2].primary?.title,
      ).toBe("Chili");
    });
    expect(
      getMockMealsBoard(testWeekStartDate).days[1].slots[2].primary?.title,
    ).toBe("Tacos");
    expect(
      screen.queryByRole("dialog", { name: "Meal planning" }),
    ).not.toBeInTheDocument();
    expect(saveRequests).toHaveLength(1);
    expect(saveRequests[0].pathname).toBe("/api/meals/plans");
    expect(
      saveRequests[0].body.slots.map((slot) => slot.primary.title),
    ).toEqual(["Chili", "Tacos"]);
    expect(singleSlotSaveCalls).toBe(0);
  });

  it("handles backend 409 save-time conflicts without overwriting and can skip conflicted drafts", async () => {
    seedMockMealsBoard(createEmptyMealsBoard());
    const saveRequests: SaveMealPlanRequest[] = [];
    let singleSlotSaveCalls = 0;
    server.use(
      http.post(`${API_BASE}/meals/plans`, async ({ request }) => {
        const body = (await request.json()) as SaveMealPlanRequest;
        saveRequests.push(body);

        if (saveRequests.length === 1) {
          return HttpResponse.json(
            { message: "Some meal slots are no longer empty." },
            { status: 409 },
          );
        }

        const savedBoard = withSavedMealPlan(
          getMockMealsBoard(body.weekStartDate),
          body,
        );
        seedMockMealsBoard(savedBoard);
        return HttpResponse.json({ data: savedBoard });
      }),
      http.put(`${API_BASE}/meals/slots`, () => {
        singleSlotSaveCalls += 1;
        return HttpResponse.json(
          { message: "single-slot save should not be used" },
          { status: 500 },
        );
      }),
    );
    const { user } = renderWithUser(<MealsView />);

    await user.click(
      await screen.findByRole("button", { name: "Fill empty slots" }),
    );
    await user.click(screen.getByRole("button", { name: "Start planning" }));
    await user.type(screen.getByLabelText("Meal name"), "Chili");
    await user.click(
      screen.getByRole("button", { name: "Add quick meal draft" }),
    );
    await user.type(screen.getByLabelText("Meal name"), "Tacos");
    await user.click(
      screen.getByRole("button", { name: "Add quick meal draft" }),
    );

    seedMockMealsBoard(
      withOccupiedDinnerSlot(createEmptyMealsBoard(), 0, "Already planned"),
    );
    await user.click(screen.getByRole("button", { name: "Review plan" }));
    await user.click(screen.getByRole("button", { name: "Save to week" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Some meal slots are no longer empty.",
    );
    expect(
      await screen.findByRole("button", {
        name: "Skip conflicted and save remaining",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Replace primary" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Add as extra" }),
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: "Skip conflicted and save remaining",
      }),
    );

    await waitFor(() => {
      const board = getMockMealsBoard(testWeekStartDate);
      expect(board.days[0].slots[2].primary?.title).toBe("Already planned");
      expect(board.days[1].slots[2].primary?.title).toBe("Tacos");
    });
    expect(
      screen.queryByRole("dialog", { name: "Meal planning" }),
    ).not.toBeInTheDocument();
    expect(saveRequests).toHaveLength(2);
    expect(saveRequests[1].slots).toHaveLength(1);
    expect(saveRequests[1].slots[0]).toMatchObject({
      dayIndex: 1,
      mealType: "dinner",
    });
    expect(singleSlotSaveCalls).toBe(0);
  });

  it("keeps save controls disabled while backend conflict resolution is pending", async () => {
    seedMockMealsBoard(createEmptyMealsBoard());
    const saveRequests: SaveMealPlanRequest[] = [];
    let boardRefetchStarted = false;
    let releaseBoardRefetch: () => void = () => {};
    const boardRefetchGate = new Promise<void>((resolve) => {
      releaseBoardRefetch = resolve;
    });
    server.use(
      http.post(`${API_BASE}/meals/plans`, async ({ request }) => {
        saveRequests.push((await request.json()) as SaveMealPlanRequest);
        return HttpResponse.json(
          { message: "Some meal slots are no longer empty." },
          { status: 409 },
        );
      }),
    );
    const { user } = renderWithUser(<MealsView />);

    await user.click(
      await screen.findByRole("button", { name: "Fill empty slots" }),
    );
    await user.click(screen.getByRole("button", { name: "Start planning" }));
    await user.type(screen.getByLabelText("Meal name"), "Chili");
    await user.click(
      screen.getByRole("button", { name: "Add quick meal draft" }),
    );

    seedMockMealsBoard(
      withOccupiedDinnerSlot(createEmptyMealsBoard(), 0, "Already planned"),
    );
    server.use(
      http.get(`${API_BASE}/meals/board`, async ({ request }) => {
        boardRefetchStarted = true;
        await boardRefetchGate;
        const weekStartDate = new URL(request.url).searchParams.get(
          "weekStartDate",
        );
        return HttpResponse.json({
          data: getMockMealsBoard(weekStartDate ?? testWeekStartDate),
        });
      }),
    );

    await user.click(screen.getByRole("button", { name: "Review plan" }));
    await user.click(screen.getByRole("button", { name: "Save to week" }));

    await waitFor(() => {
      expect(boardRefetchStarted).toBe(true);
    });
    const saveButton = screen.getByRole("button", {
      name: /^(Save to week|Saving...)$/,
    });
    expect(saveButton).toBeDisabled();

    await user.click(saveButton);
    releaseBoardRefetch();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Some meal slots are no longer empty.",
    );
    expect(saveRequests).toHaveLength(1);
  });

  it("keeps all conflicted drafts when no remaining drafts can be saved", async () => {
    seedMockMealsBoard(createEmptyMealsBoard());
    const saveRequests: SaveMealPlanRequest[] = [];
    server.use(
      http.post(`${API_BASE}/meals/plans`, async ({ request }) => {
        saveRequests.push((await request.json()) as SaveMealPlanRequest);
        return HttpResponse.json(
          { message: "Some meal slots are no longer empty." },
          { status: 409 },
        );
      }),
    );
    const { user } = renderWithUser(<MealsView />);

    await user.click(
      await screen.findByRole("button", { name: "Fill empty slots" }),
    );
    await user.click(screen.getByRole("button", { name: "Start planning" }));
    await user.type(screen.getByLabelText("Meal name"), "Chili");
    await user.click(
      screen.getByRole("button", { name: "Add quick meal draft" }),
    );

    seedMockMealsBoard(
      withOccupiedDinnerSlot(createEmptyMealsBoard(), 0, "Already planned"),
    );
    await user.click(screen.getByRole("button", { name: "Review plan" }));
    await user.click(screen.getByRole("button", { name: "Save to week" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Some meal slots are no longer empty.",
    );
    const skipConflicted = screen.getByRole("button", {
      name: "Skip conflicted and save remaining",
    });
    expect(skipConflicted).toBeDisabled();
    expect(
      screen.getByText("No remaining drafts to save."),
    ).toBeInTheDocument();

    await user.click(skipConflicted);
    expect(saveRequests).toHaveLength(1);

    await user.click(
      screen.getAllByRole("button", { name: "Keep editing" })[0],
    );

    expect(screen.getByText("Sunday dinner - 1 of 7")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Draft dinner: Chili" }),
    ).toHaveAttribute("aria-current", "true");
    expect(saveRequests).toHaveLength(1);
  });

  it("cancel save after a backend conflict returns to review and keeps drafts", async () => {
    seedMockMealsBoard(createEmptyMealsBoard());
    const saveRequests: SaveMealPlanRequest[] = [];
    server.use(
      http.post(`${API_BASE}/meals/plans`, async ({ request }) => {
        saveRequests.push((await request.json()) as SaveMealPlanRequest);
        return HttpResponse.json(
          { message: "Some meal slots are no longer empty." },
          { status: 409 },
        );
      }),
    );
    const { user } = renderWithUser(<MealsView />);

    await user.click(
      await screen.findByRole("button", { name: "Fill empty slots" }),
    );
    await user.click(screen.getByRole("button", { name: "Start planning" }));
    await user.type(screen.getByLabelText("Meal name"), "Chili");
    await user.click(
      screen.getByRole("button", { name: "Add quick meal draft" }),
    );
    await user.type(screen.getByLabelText("Meal name"), "Tacos");
    await user.click(
      screen.getByRole("button", { name: "Add quick meal draft" }),
    );

    seedMockMealsBoard(
      withOccupiedDinnerSlot(createEmptyMealsBoard(), 0, "Already planned"),
    );
    await user.click(screen.getByRole("button", { name: "Review plan" }));
    await user.click(screen.getByRole("button", { name: "Save to week" }));
    expect(
      await screen.findByRole("button", {
        name: "Skip conflicted and save remaining",
      }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancel save" }));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: "Skip conflicted and save remaining",
      }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("2 meals ready to add")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Draft dinner: Chili" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Draft dinner: Tacos" }),
    ).toBeInTheDocument();
    expect(saveRequests).toHaveLength(1);
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

  it("renders one-line weekday headers while retaining full weekday names", async () => {
    viewport.showGrid = true;
    seedMockMealsBoard(createEmptyMealsBoard());

    renderWithUser(<MealsView />);

    const table = await screen.findByRole("table", { name: "Weekly meals" });
    expect(within(table).getByText("Wed")).toBeVisible();
    expect(within(table).queryByText("Wednesday")).not.toBeInTheDocument();
    expect(
      within(table).getByRole("columnheader", { name: "Sunday" }),
    ).toBeInTheDocument();
  });

  it("highlights today in the weekday header", async () => {
    viewport.showGrid = true;
    seedMockMealsBoard(createEmptyMealsBoard());

    renderWithUser(<MealsView />);

    const table = await screen.findByRole("table", { name: "Weekly meals" });
    const todayHeader = within(table).getByRole("columnheader", {
      name: "Wednesday",
    });
    expect(todayHeader).toHaveAttribute("aria-label", "Wednesday");
    expect(todayHeader).toHaveAttribute("aria-current", "date");
    expect(
      within(table)
        .getAllByRole("columnheader")
        .filter((header) => header.getAttribute("aria-current") === "date"),
    ).toHaveLength(1);
  });

  it("uses full weekday context in large-screen meal slot names", async () => {
    viewport.showGrid = true;
    seedMockMealsBoard(
      withOccupiedMealSlot(
        createEmptyMealsBoard(),
        3,
        "dinner",
        "Turbong Manok",
      ),
    );

    renderWithUser(<MealsView />);

    expect(
      await screen.findByRole("button", {
        name: "Open dinner, Wednesday: Turbong Manok",
      }),
    ).toBeInTheDocument();
  });

  it("uses weekday context after the empty meal action label on large screens", async () => {
    viewport.showGrid = true;
    seedMockMealsBoard(createEmptyMealsBoard());

    renderWithUser(<MealsView />);

    expect(
      await screen.findByRole("button", {
        name: "Add breakfast meal, Sunday",
      }),
    ).toBeInTheDocument();
  });

  it("merges board actions into the large-screen week header", async () => {
    viewport.showGrid = true;
    seedMockMealsBoard(createEmptyMealsBoard());

    renderWithUser(<MealsView />);

    const fillEmptySlots = await screen.findByRole("button", {
      name: "Fill empty slots",
    });
    expect(
      screen.getAllByRole("button", { name: "Fill empty slots" }),
    ).toHaveLength(1);
    expect(fillEmptySlots.closest('[data-slot="week-header"]')).not.toBeNull();
  });

  it("keeps board actions outside the week header below the large-screen breakpoint", async () => {
    seedMockMealsBoard(createEmptyMealsBoard());

    renderWithUser(<MealsView />);

    const fillEmptySlots = await screen.findByRole("button", {
      name: "Fill empty slots",
    });
    expect(fillEmptySlots.closest('[data-slot="week-header"]')).toBeNull();
  });

  it("prompts when moving into an occupied slot and move clears the source", async () => {
    const board = createOccupiedMealsBoard();
    seedMockMealsBoard(board);
    const { user } = renderWithUser(
      <MealEditorSheet
        isOpen
        slotId={{
          weekStartDate: board.weekStartDate,
          dayIndex: 1,
          mealType: "dinner",
        }}
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
        slotId={{
          weekStartDate: board.weekStartDate,
          dayIndex: 1,
          mealType: "dinner",
        }}
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

  it.each([
    ["move", "Move meal", "Move here"],
    ["duplicate", "Duplicate meal", "Duplicate here"],
  ])("prompts when trying to %s into an extras-only slot", async (_kind, actionLabel, confirmLabel) => {
    const board = withExtrasOnlyDinnerSlot(
      createOccupiedMealsBoard(),
      2,
      "Garlic bread",
    );
    seedMockMealsBoard(board);
    const { user } = renderWithUser(
      <MealEditorSheet
        isOpen
        slotId={{
          weekStartDate: board.weekStartDate,
          dayIndex: 1,
          mealType: "dinner",
        }}
        board={board}
        readOnly={false}
        onOpenChange={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: actionLabel }));
    await user.click(screen.getByRole("button", { name: confirmLabel }));

    expect(
      screen.getByText("That slot already has a meal"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Replace primary" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Add as extra" }),
    ).toBeInTheDocument();
  });

  it("removes a planned meal from the editor", async () => {
    const board = createOccupiedMealsBoard();
    seedMockMealsBoard(board);
    const { user } = renderWithUser(
      <MealEditorSheet
        isOpen
        slotId={{
          weekStartDate: board.weekStartDate,
          dayIndex: 1,
          mealType: "dinner",
        }}
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

  it("closes the editor only after a successful removal", async () => {
    const board = createOccupiedMealsBoard();
    seedMockMealsBoard(board);
    const onOpenChange = vi.fn();
    const { user } = renderWithUser(
      <MealEditorSheet
        isOpen
        slotId={{
          weekStartDate: board.weekStartDate,
          dayIndex: 1,
          mealType: "dinner",
        }}
        board={board}
        readOnly={false}
        onOpenChange={onOpenChange}
      />,
    );

    // The editor is not dismissed before the removal is requested.
    expect(onOpenChange).not.toHaveBeenCalledWith(false);

    await user.click(screen.getByRole("button", { name: "Remove meal" }));

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it("keeps the editor open with an actionable error when removal fails", async () => {
    const board = createOccupiedMealsBoard();
    seedMockMealsBoard(board);
    server.use(
      http.delete(`${API_BASE}/meals/slots`, () =>
        HttpResponse.json(
          { message: "Could not remove meal" },
          { status: 500 },
        ),
      ),
    );
    const onOpenChange = vi.fn();
    const { user } = renderWithUser(
      <MealEditorSheet
        isOpen
        slotId={{
          weekStartDate: board.weekStartDate,
          dayIndex: 1,
          mealType: "dinner",
        }}
        board={board}
        readOnly={false}
        onOpenChange={onOpenChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Remove meal" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Could not remove meal");

    // Failure leaves the editor open and the action retryable.
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(screen.getByRole("button", { name: "Remove meal" })).toBeEnabled();
  });

  it("edits the slot note from the editor", async () => {
    const board = createOccupiedMealsBoard();
    seedMockMealsBoard(board);
    const { user } = renderWithUser(
      <MealEditorSheet
        isOpen
        slotId={{
          weekStartDate: board.weekStartDate,
          dayIndex: 1,
          mealType: "dinner",
        }}
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
        slotId={{
          weekStartDate: board.weekStartDate,
          dayIndex: 1,
          mealType: "dinner",
        }}
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
        slotId={{
          weekStartDate: board.weekStartDate,
          dayIndex: 1,
          mealType: "dinner",
        }}
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
        slotId={{
          weekStartDate: board.weekStartDate,
          dayIndex: 1,
          mealType: "dinner",
        }}
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

  it("resets recipe detail mode when reopening on an extras-only slot", async () => {
    const recipeBoard = createRecipeBackedMealsBoard();
    const extrasBoard = createExtrasOnlyMealsBoard();
    seedMockRecipes([testRecipeDetail]);
    const onOpenChange = vi.fn();
    const recipeSlotId = {
      weekStartDate: recipeBoard.weekStartDate,
      dayIndex: 1,
      mealType: "dinner" as const,
    };
    const extrasSlotId = {
      weekStartDate: extrasBoard.weekStartDate,
      dayIndex: 4,
      mealType: "dinner" as const,
    };
    const { user, rerender } = renderWithUser(
      <MealEditorSheet
        isOpen
        slotId={recipeSlotId}
        board={recipeBoard}
        readOnly={false}
        onOpenChange={onOpenChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: "View recipe" }));
    expect(
      await screen.findByRole("heading", { name: testRecipeDetail.title }),
    ).toBeInTheDocument();

    rerender(
      <MealEditorSheet
        isOpen={false}
        slotId={recipeSlotId}
        board={recipeBoard}
        readOnly={false}
        onOpenChange={onOpenChange}
      />,
    );
    rerender(
      <MealEditorSheet
        isOpen
        slotId={extrasSlotId}
        board={extrasBoard}
        readOnly={false}
        onOpenChange={onOpenChange}
      />,
    );

    const editorDialog = await screen.findByRole("dialog", {
      name: "Dinner Plan",
    });
    expect(within(editorDialog).getByText("Dinner extras")).toBeInTheDocument();
    expect(within(editorDialog).getByText("Garlic bread")).toBeInTheDocument();
    expect(
      within(editorDialog).queryByText("Recipe could not be loaded."),
    ).not.toBeInTheDocument();
    expect(
      within(editorDialog).queryByRole("button", { name: "View recipe" }),
    ).not.toBeInTheDocument();
  });

  it("shows no Edit/Add-to-Meals/Favorite buttons in the meal-context recipe detail", async () => {
    const board = createRecipeBackedMealsBoard();
    seedMockMealsBoard(board);
    seedMockRecipes([testRecipeDetail]);
    const { user } = renderWithUser(
      <MealEditorSheet
        isOpen
        slotId={{
          weekStartDate: board.weekStartDate,
          dayIndex: 1,
          mealType: "dinner",
        }}
        board={board}
        readOnly={false}
        onOpenChange={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "View recipe" }));

    // Back is always present
    expect(
      await screen.findByRole("button", { name: "Back to recipes" }),
    ).toBeInTheDocument();
    // Recipe content present
    expect(
      screen.getByRole("heading", { name: testRecipeDetail.title }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Ingredients" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Instructions" }),
    ).toBeInTheDocument();
    // Dead-end action buttons must NOT appear
    expect(
      screen.queryByRole("button", { name: "Edit recipe" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Add to Meals" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: `Favorite recipe: ${testRecipeDetail.title}`,
      }),
    ).not.toBeInTheDocument();
  });

  it("reflects a saved meal note in the editor without reopening", async () => {
    seedMockMealsBoard(createOccupiedMealsBoard());
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: Infinity, staleTime: 0 },
        mutations: { retry: false },
      },
    });
    const { user } = renderWithUser(<MealsView />, { queryClient });

    await user.click(
      await screen.findByRole("button", { name: /open dinner: pasta/i }),
    );

    await user.click(screen.getByRole("button", { name: "Add meal note" }));
    await user.type(screen.getByLabelText("Meal note"), "Family favorite");
    await user.click(screen.getByRole("button", { name: "Save note" }));

    // The sheet stays open and its read view shows the freshly saved note.
    const sheet = screen.getByRole("dialog", { name: "Dinner Plan" });
    expect(
      await within(sheet).findByText("Family favorite"),
    ).toBeInTheDocument();
    expect(
      within(sheet).getByRole("button", { name: "Edit meal note" }),
    ).toBeInTheDocument();
  });

  it("does not lose the editor when the board revalidates", async () => {
    seedMockMealsBoard(createOccupiedMealsBoard());
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: Infinity, staleTime: 0 },
        mutations: { retry: false },
      },
    });
    const { user } = renderWithUser(<MealsView />, { queryClient });

    await user.click(
      await screen.findByRole("button", { name: /open dinner: pasta/i }),
    );
    const sheet = screen.getByRole("dialog", { name: "Dinner Plan" });
    expect(within(sheet).getByText("Pasta")).toBeInTheDocument();

    await queryClient.invalidateQueries({
      queryKey: mealsKeys.board(testWeekStartDate),
    });

    // The editor and its primary title survive a background board refetch.
    await waitFor(() => {
      expect(
        screen.getByRole("dialog", { name: "Dinner Plan" }),
      ).toBeInTheDocument();
    });
    expect(
      within(screen.getByRole("dialog", { name: "Dinner Plan" })).getByText(
        "Pasta",
      ),
    ).toBeInTheDocument();
  });

  it("closes the editor when the selected live slot is removed during a refetch", async () => {
    seedMockMealsBoard(createOccupiedMealsBoard());
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: Infinity, staleTime: 0 },
        mutations: { retry: false },
      },
    });
    const { user } = renderWithUser(<MealsView />, { queryClient });

    await user.click(
      await screen.findByRole("button", { name: /open dinner: pasta/i }),
    );
    expect(
      screen.getByRole("dialog", { name: "Dinner Plan" }),
    ).toBeInTheDocument();

    const occupiedBoard = createOccupiedMealsBoard();
    const removedMondayDinner: MealBoard = {
      ...occupiedBoard,
      days: occupiedBoard.days.map((day) =>
        day.dayIndex === 1
          ? {
              ...day,
              slots: day.slots.map((slot) =>
                slot.mealType === "dinner"
                  ? {
                      ...slot,
                      id: null,
                      primary: null,
                      extras: [],
                      note: null,
                    }
                  : slot,
              ),
            }
          : day,
      ),
    };
    seedMockMealsBoard(removedMondayDinner);
    await queryClient.invalidateQueries({
      queryKey: mealsKeys.board(testWeekStartDate),
    });

    await waitFor(() => {
      const cached = queryClient.getQueryData<ApiResponse<MealBoard>>(
        mealsKeys.board(testWeekStartDate),
      );
      expect(cached?.data.days[1].slots[2].primary).toBeNull();
    });
    expect(
      screen.queryByRole("dialog", { name: "Dinner Plan" }),
    ).not.toBeInTheDocument();

    seedMockMealsBoard(createOccupiedMealsBoard());
    await queryClient.invalidateQueries({
      queryKey: mealsKeys.board(testWeekStartDate),
    });

    await waitFor(() => {
      const cached = queryClient.getQueryData<ApiResponse<MealBoard>>(
        mealsKeys.board(testWeekStartDate),
      );
      expect(cached?.data.days[1].slots[2].primary?.title).toBe("Pasta");
    });
    expect(
      screen.queryByRole("dialog", { name: "Dinner Plan" }),
    ).not.toBeInTheDocument();
  });

  it("re-checks collision against the live board", async () => {
    // Monday dinner occupied; Tuesday dinner (the default move target) empty.
    const board = createOccupiedMealsBoard();
    const emptyTuesdayDinner: MealBoard = {
      ...board,
      days: board.days.map((day) =>
        day.dayIndex === 2
          ? {
              ...day,
              slots: day.slots.map((slot) =>
                slot.mealType === "dinner"
                  ? {
                      ...slot,
                      id: null,
                      primary: null,
                      extras: [],
                      note: null,
                    }
                  : slot,
              ),
            }
          : day,
      ),
    };
    seedMockMealsBoard(emptyTuesdayDinner);
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: Infinity, staleTime: 0 },
        mutations: { retry: false },
      },
    });
    const { user } = renderWithUser(<MealsView />, { queryClient });

    await user.click(
      await screen.findByRole("button", { name: /open dinner: pasta/i }),
    );

    // Tuesday dinner becomes occupied after the editor opened.
    const occupiedTuesdayDinner = createOccupiedMealsBoard();
    seedMockMealsBoard(occupiedTuesdayDinner);
    await queryClient.invalidateQueries({
      queryKey: mealsKeys.board(testWeekStartDate),
    });
    await waitFor(() => {
      expect(
        getMockMealsBoard(testWeekStartDate).days[2].slots[2].primary?.title,
      ).toBe("Soup");
    });

    await user.click(screen.getByRole("button", { name: "Move meal" }));
    await user.click(screen.getByRole("button", { name: "Move here" }));

    expect(
      await screen.findByText("That slot already has a meal"),
    ).toBeInTheDocument();
  });

  it("past occupied slot is enabled and opens the editor in read-only mode", async () => {
    const pastWeekStartDate = "2026-05-31";
    const pastBoard = createOccupiedMealsBoard();
    // Override weekStartDate so the board and slots belong to the past week
    const pastOccupied = {
      ...pastBoard,
      weekStartDate: pastWeekStartDate,
      days: pastBoard.days.map((day) => ({
        ...day,
        slots: day.slots.map((slot) => ({
          ...slot,
          weekStartDate: pastWeekStartDate,
        })),
      })),
    };
    seedMockMealsBoard(pastOccupied);
    const { user } = renderWithUser(<MealsView />);

    await user.click(
      await screen.findByRole("button", { name: "Previous week" }),
    );

    // The week banner and review-only label must be visible
    expect(await screen.findByText("Review only")).toBeInTheDocument();

    // The occupied dinner card must be present and NOT disabled
    const occupiedCard = await screen.findByRole("button", {
      name: /open dinner: pasta/i,
    });
    expect(occupiedCard).not.toBeDisabled();

    // Clicking the occupied card opens the editor
    await user.click(occupiedCard);
    const editorDialog = await screen.findByRole("dialog", {
      name: "Dinner Plan",
    });
    expect(editorDialog).toBeInTheDocument();

    // Mutation buttons must be disabled on a read-only past week
    expect(
      within(editorDialog).getByRole("button", { name: "Replace meal" }),
    ).toBeDisabled();
    expect(
      within(editorDialog).getByRole("button", { name: "Add extra or side" }),
    ).toBeDisabled();
    expect(
      within(editorDialog).getByRole("button", { name: "Move meal" }),
    ).toBeDisabled();
    expect(
      within(editorDialog).getByRole("button", { name: "Duplicate meal" }),
    ).toBeDisabled();
    expect(
      within(editorDialog).getByRole("button", { name: "Remove meal" }),
    ).toBeDisabled();

    // Extra-remove ✕ must NOT be rendered on a read-only week
    expect(
      within(editorDialog).queryByRole("button", {
        name: /remove extra:/i,
      }),
    ).not.toBeInTheDocument();
  });

  it("past recipe-backed occupied slot opens editor with View recipe available", async () => {
    const pastWeekStartDate = "2026-05-31";
    const pastBoard = createRecipeBackedMealsBoard();
    const pastRecipeBacked = {
      ...pastBoard,
      weekStartDate: pastWeekStartDate,
      days: pastBoard.days.map((day) => ({
        ...day,
        slots: day.slots.map((slot) => ({
          ...slot,
          weekStartDate: pastWeekStartDate,
        })),
      })),
    };
    seedMockMealsBoard(pastRecipeBacked);
    seedMockRecipes([testRecipeDetail]);
    const { user } = renderWithUser(<MealsView />);

    await user.click(
      await screen.findByRole("button", { name: "Previous week" }),
    );

    expect(await screen.findByText("Review only")).toBeInTheDocument();

    // Open the recipe-backed occupied slot
    const occupiedCard = await screen.findByRole("button", {
      name: /open dinner: snapshot salmon/i,
    });
    expect(occupiedCard).not.toBeDisabled();
    await user.click(occupiedCard);

    const editorDialog = await screen.findByRole("dialog", {
      name: "Dinner Plan",
    });

    // "View recipe" must be present and clickable (no disabled gate)
    const viewRecipeBtn = within(editorDialog).getByRole("button", {
      name: "View recipe",
    });
    expect(viewRecipeBtn).not.toBeDisabled();

    await user.click(viewRecipeBtn);

    // Recipe detail view is shown
    expect(
      await screen.findByRole("heading", { name: testRecipeDetail.title }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Ingredients" }),
    ).toBeInTheDocument();
  });

  it("shows a Retry button in the board error state and retries successfully", async () => {
    // Force the board GET to return a 500 so the error block renders.
    server.use(
      http.get(
        `${API_BASE}/meals/board`,
        () => new HttpResponse(null, { status: 500 }),
      ),
    );

    const { user } = renderWithUser(<MealsView />);

    expect(
      await screen.findByRole("heading", { name: "Meals could not be loaded" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeEnabled();

    // Remove the error override and seed a real board so retry succeeds.
    server.resetHandlers();
    seedMockMealsBoard(createEmptyMealsBoard());

    await user.click(screen.getByRole("button", { name: "Retry" }));

    // After a successful refetch the board's add affordances should be visible.
    expect(
      await screen.findAllByRole("button", { name: /add .*meal/i }),
    ).not.toHaveLength(0);
    expect(
      screen.queryByRole("heading", { name: "Meals could not be loaded" }),
    ).not.toBeInTheDocument();
  });

  it("moves a planned meal to a chosen day and meal type", async () => {
    const board = createOccupiedMealsBoard(); // Monday dinner: Pasta + Salad
    seedMockMealsBoard(board);
    const { user } = renderWithUser(
      <MealEditorSheet
        isOpen
        slotId={{
          weekStartDate: board.weekStartDate,
          dayIndex: 1,
          mealType: "dinner",
        }}
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

  // ---------------------------------------------------------------------------
  // Task 6: "Add ingredients" → grocery-list picker/create + bulk append
  // ---------------------------------------------------------------------------

  function groceryList(overrides: Partial<ListDetail> = {}): ListDetail {
    return {
      id: "list-grocery-1",
      name: "Groceries",
      kind: "grocery",
      categoryDisplayMode: "flat",
      showCompletedOverride: null,
      categories: [],
      items: [],
      createdAt: "2026-06-01T00:00:00",
      updatedAt: "2026-06-01T00:00:00",
      ...overrides,
    };
  }

  function toDoList(overrides: Partial<ListDetail> = {}): ListDetail {
    return {
      id: "list-todo-1",
      name: "Errands",
      kind: "to-do",
      categoryDisplayMode: "flat",
      showCompletedOverride: null,
      categories: [],
      items: [],
      createdAt: "2026-06-01T00:00:00",
      updatedAt: "2026-06-01T00:00:00",
      ...overrides,
    };
  }

  it("shows Add ingredients on an editable week with a recipe-backed meal and hides it on past weeks", async () => {
    // Current week (editable) with a recipe-backed dinner.
    seedMockMealsBoard(createRecipeBackedMealsBoard());
    // Past week board so navigating back is review-only.
    seedMockMealsBoard(createEmptyMealsBoard("2026-05-31"));
    seedMockRecipes([testRecipeDetail]);
    const { user } = renderWithUser(<MealsView />);

    // Editable week: the action is present alongside Fill empty slots.
    expect(
      await screen.findByRole("button", { name: "Add ingredients" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Fill empty slots" }),
    ).toBeInTheDocument();

    // Navigate to a past week: review-only, so Add ingredients disappears.
    await user.click(screen.getByRole("button", { name: "Previous week" }));
    expect(await screen.findByText("Review only")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Add ingredients" }),
    ).not.toBeInTheDocument();
  });

  it("hides Add ingredients when the visible week has no recipe-backed meals", async () => {
    // Only a quick meal + empty slots: nothing recipe-backed to extract.
    seedMockMealsBoard(
      withOccupiedDinnerSlot(createEmptyMealsBoard(), 1, "Leftovers"),
    );
    renderWithUser(<MealsView />);

    // The board renders (quick meal visible) but the action is absent.
    expect(await screen.findByText("Leftovers")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Add ingredients" }),
    ).not.toBeInTheDocument();
  });

  it("defaults to the only grocery list and appends selected rows once, then offers View list", async () => {
    seedMockMealsBoard(createRecipeBackedMealsBoard());
    seedMockRecipes([testRecipeDetail]);
    // Exactly one grocery list (plus a to-do list that must never be offered).
    seedMockLists([groceryList(), toDoList()]);

    const bulkRequests: Array<{ id: string; texts: string[] }> = [];
    server.use(
      http.post(
        `${API_BASE}/lists/:id/items/bulk`,
        async ({ params, request }) => {
          const body = (await request.json()) as {
            items: Array<{ text: string }>;
          };
          bulkRequests.push({
            id: params.id as string,
            texts: body.items.map((i) => i.text),
          });
          const createdItems = body.items.map((row, index) => ({
            id: `created-${index}`,
            text: row.text,
            completed: false,
            completedAt: null,
            categoryId: null,
            createdAt: "2026-06-07T00:00:00",
            updatedAt: "2026-06-07T00:00:00",
          }));
          return HttpResponse.json(
            { data: createdItems, message: "ok" },
            { status: 201 },
          );
        },
      ),
    );

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: Infinity, staleTime: 0 },
        mutations: { retry: false },
      },
    });
    // Prime the list-detail cache as if the user had opened this list before,
    // so the bulk hook's write-through cache update is exercised and observable.
    queryClient.setQueryData(["lists", "detail", "list-grocery-1"], {
      data: groceryList(),
      message: "ok",
    });
    const { user } = renderWithUser(<MealsView />, { queryClient });

    await user.click(
      await screen.findByRole("button", { name: "Add ingredients" }),
    );

    // The review sheet resolves the recipe's verbatim ingredient rows.
    expect(
      await screen.findByDisplayValue("Salmon fillets"),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /add to list/i }));

    // Exactly one bulk POST, targeting the only grocery list, with the rows.
    await waitFor(() => expect(bulkRequests).toHaveLength(1));
    expect(bulkRequests[0].id).toBe("list-grocery-1");
    expect(bulkRequests[0].texts).toEqual([
      "Salmon fillets",
      "Asparagus",
      "Lemon",
    ]);

    // Success surfaces a "View list" affordance.
    const viewList = await screen.findByRole("button", { name: /view list/i });
    expect(viewList).toBeInTheDocument();

    // The list-detail cache gained the appended items.
    await waitFor(() => {
      const cached = queryClient.getQueryData<ApiResponse<ListDetail>>([
        "lists",
        "detail",
        "list-grocery-1",
      ]);
      expect(cached?.data.items.map((i) => i.text)).toEqual([
        "Salmon fillets",
        "Asparagus",
        "Lemon",
      ]);
    });

    // Clicking View list navigates to that list.
    await user.click(viewList);
    expect(useAppStore.getState().activeModule).toBe("lists");
    expect(useAppStore.getState().consumeListDetailIntent()).toBe(
      "list-grocery-1",
    );
  });

  it("appends to the grocery list the user picks when several exist", async () => {
    seedMockMealsBoard(createRecipeBackedMealsBoard());
    seedMockRecipes([testRecipeDetail]);
    // Several grocery lists → no auto-select; the picker drives the target.
    seedMockLists([
      groceryList({ id: "list-grocery-1", name: "Groceries" }),
      groceryList({ id: "list-grocery-2", name: "Costco run" }),
    ]);

    const bulkRequests: Array<{ id: string; texts: string[] }> = [];
    server.use(
      http.post(
        `${API_BASE}/lists/:id/items/bulk`,
        async ({ params, request }) => {
          const body = (await request.json()) as {
            items: Array<{ text: string }>;
          };
          bulkRequests.push({
            id: params.id as string,
            texts: body.items.map((i) => i.text),
          });
          return HttpResponse.json(
            { data: [], message: "ok" },
            { status: 201 },
          );
        },
      ),
    );

    const { user } = renderWithUser(<MealsView />);

    await user.click(
      await screen.findByRole("button", { name: "Add ingredients" }),
    );
    expect(
      await screen.findByDisplayValue("Salmon fillets"),
    ).toBeInTheDocument();

    // With several lists a picker renders (no auto-select). "Add to list" is
    // blocked until a target is chosen.
    const picker = await screen.findByRole("combobox", {
      name: /grocery list/i,
    });
    expect(screen.getByRole("button", { name: /add to list/i })).toBeDisabled();

    // Pick the SECOND grocery list.
    await user.selectOptions(picker, "list-grocery-2");
    await user.click(screen.getByRole("button", { name: /add to list/i }));

    // Exactly one bulk POST, targeting the user's chosen (second) list.
    await waitFor(() => expect(bulkRequests).toHaveLength(1));
    expect(bulkRequests[0].id).toBe("list-grocery-2");
    expect(bulkRequests[0].texts).toEqual([
      "Salmon fillets",
      "Asparagus",
      "Lemon",
    ]);
    expect(
      await screen.findByRole("button", { name: /view list/i }),
    ).toBeInTheDocument();
  });

  it("lets the user create a grocery list when none exists, then append into it", async () => {
    seedMockMealsBoard(createRecipeBackedMealsBoard());
    seedMockRecipes([testRecipeDetail]);
    // No grocery lists at all (only a to-do list, which is not a valid target).
    seedMockLists([toDoList()]);

    const createRequests: Array<{ name: string; kind: string }> = [];
    const bulkRequests: Array<{ id: string; texts: string[] }> = [];
    server.use(
      http.post(`${API_BASE}/lists`, async ({ request }) => {
        const body = (await request.json()) as { name: string; kind: string };
        createRequests.push(body);
        const created = groceryList({
          id: "list-grocery-new",
          name: body.name,
        });
        return HttpResponse.json(
          { data: created, message: "created" },
          { status: 201 },
        );
      }),
      http.post(
        `${API_BASE}/lists/:id/items/bulk`,
        async ({ params, request }) => {
          const body = (await request.json()) as {
            items: Array<{ text: string }>;
          };
          bulkRequests.push({
            id: params.id as string,
            texts: body.items.map((i) => i.text),
          });
          const createdItems = body.items.map((row, index) => ({
            id: `created-${index}`,
            text: row.text,
            completed: false,
            completedAt: null,
            categoryId: null,
            createdAt: "2026-06-07T00:00:00",
            updatedAt: "2026-06-07T00:00:00",
          }));
          return HttpResponse.json(
            { data: createdItems, message: "ok" },
            { status: 201 },
          );
        },
      ),
    );

    const { user } = renderWithUser(<MealsView />);

    await user.click(
      await screen.findByRole("button", { name: "Add ingredients" }),
    );

    // With no grocery list, the sheet offers a create-grocery-list affordance.
    expect(
      await screen.findByDisplayValue("Salmon fillets"),
    ).toBeInTheDocument();
    const nameField = await screen.findByLabelText(/grocery list name/i);
    await user.type(nameField, "Weekly groceries");
    await user.click(
      screen.getByRole("button", { name: /create grocery list/i }),
    );

    // The grocery list was created with the right kind.
    await waitFor(() => expect(createRequests).toHaveLength(1));
    expect(createRequests[0]).toMatchObject({
      name: "Weekly groceries",
      kind: "grocery",
    });

    // Then the bulk append targets the freshly created list.
    await user.click(screen.getByRole("button", { name: /add to list/i }));
    await waitFor(() => expect(bulkRequests).toHaveLength(1));
    expect(bulkRequests[0].id).toBe("list-grocery-new");
    expect(bulkRequests[0].texts).toEqual([
      "Salmon fillets",
      "Asparagus",
      "Lemon",
    ]);
    expect(
      await screen.findByRole("button", { name: /view list/i }),
    ).toBeInTheDocument();
  });

  it("disables grocery list creation while offline and sends no create request", async () => {
    setNavigatorOnline(false);
    seedMockMealsBoard(createRecipeBackedMealsBoard());
    seedMockRecipes([testRecipeDetail]);
    seedMockLists([]);

    let createCalls = 0;
    server.use(
      http.post(`${API_BASE}/lists`, () => {
        createCalls += 1;
        return HttpResponse.json(
          {
            data: groceryList({ id: "list-grocery-new" }),
            message: "created",
          },
          { status: 201 },
        );
      }),
    );

    const { user } = renderWithUser(<MealsView />);

    await user.click(
      await screen.findByRole("button", { name: "Add ingredients" }),
    );
    expect(
      await screen.findByDisplayValue("Salmon fillets"),
    ).toBeInTheDocument();

    await user.type(
      await screen.findByLabelText(/grocery list name/i),
      "Weekly groceries",
    );

    const createButton = screen.getByRole("button", {
      name: /create grocery list/i,
    });
    expect(createButton).toBeDisabled();
    expect(
      screen.getByText(
        "You're offline. Review your ingredients now and add them to your list when you're back online.",
      ),
    ).toBeInTheDocument();

    await user.click(createButton);
    expect(createCalls).toBe(0);
  });

  it("does not present a failed append as success", async () => {
    seedMockMealsBoard(createRecipeBackedMealsBoard());
    seedMockRecipes([testRecipeDetail]);
    seedMockLists([groceryList()]);

    let bulkCalls = 0;
    server.use(
      http.post(`${API_BASE}/lists/:id/items/bulk`, () => {
        bulkCalls += 1;
        return HttpResponse.json(
          { message: "Could not add items" },
          { status: 500 },
        );
      }),
    );

    const { user } = renderWithUser(<MealsView />);

    await user.click(
      await screen.findByRole("button", { name: "Add ingredients" }),
    );
    expect(
      await screen.findByDisplayValue("Salmon fillets"),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /add to list/i }));

    // The failure is surfaced.
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /could not add items|couldn't add|failed/i,
    );
    // No success affordance.
    expect(
      screen.queryByRole("button", { name: /view list/i }),
    ).not.toBeInTheDocument();
    // The reviewed selection is retained (rows still present, retryable).
    expect(screen.getByDisplayValue("Salmon fillets")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add to list/i })).toBeEnabled();
    expect(bulkCalls).toBe(1);
  });

  it("create-then-fail keeps the created list selected and retries into it without re-creating", async () => {
    seedMockMealsBoard(createRecipeBackedMealsBoard());
    seedMockRecipes([testRecipeDetail]);
    seedMockLists([]); // no grocery list yet → create path

    let createCalls = 0;
    const bulkTargets: string[] = [];
    server.use(
      // The created list intentionally is NOT added to the GET /lists mock; the
      // append target is driven by createList.onSuccess (selectedListId), not a
      // hub refetch. This is what lets the retry reuse the created list without
      // re-creating it.
      http.post(`${API_BASE}/lists`, async ({ request }) => {
        createCalls += 1;
        const body = (await request.json()) as { name: string; kind: string };
        return HttpResponse.json(
          {
            data: groceryList({ id: "list-grocery-new", name: body.name }),
            message: "created",
          },
          { status: 201 },
        );
      }),
      http.post(`${API_BASE}/lists/:id/items/bulk`, async ({ params }) => {
        bulkTargets.push(params.id as string);
        // First append fails; the retry (second) succeeds.
        if (bulkTargets.length === 1) {
          return HttpResponse.json(
            { message: "Could not add items" },
            { status: 500 },
          );
        }
        return HttpResponse.json({ data: [], message: "ok" }, { status: 201 });
      }),
    );

    const { user } = renderWithUser(<MealsView />);

    await user.click(
      await screen.findByRole("button", { name: "Add ingredients" }),
    );
    await screen.findByDisplayValue("Salmon fillets");
    await user.type(
      await screen.findByLabelText(/grocery list name/i),
      "Weekly groceries",
    );
    await user.click(
      screen.getByRole("button", { name: /create grocery list/i }),
    );
    await waitFor(() => expect(createCalls).toBe(1));

    // First append fails.
    await user.click(screen.getByRole("button", { name: /add to list/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /could not add items|couldn't add|failed/i,
    );
    expect(
      screen.queryByRole("button", { name: /view list/i }),
    ).not.toBeInTheDocument();

    // Retry: same created list is targeted, no second list is created.
    await user.click(screen.getByRole("button", { name: /add to list/i }));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /view list/i }),
      ).toBeInTheDocument(),
    );
    expect(createCalls).toBe(1);
    expect(bulkTargets).toEqual(["list-grocery-new", "list-grocery-new"]);
  });

  it("blocks an over-cap append (>100 items) with an honest error and fires no request", async () => {
    // A recipe with 101 ingredients: the review model selects one row each, so
    // the built payload exceeds the shared schema's 100-item cap.
    const overCapIngredients = Array.from(
      { length: 101 },
      (_, index) => `Ingredient ${index + 1}`,
    );
    seedMockMealsBoard(createRecipeBackedMealsBoard());
    seedMockRecipes([{ ...testRecipeDetail, ingredients: overCapIngredients }]);
    seedMockLists([groceryList()]);

    let bulkCalls = 0;
    server.use(
      http.post(`${API_BASE}/lists/:id/items/bulk`, () => {
        bulkCalls += 1;
        return HttpResponse.json({ data: [], message: "ok" }, { status: 201 });
      }),
    );

    const { user } = renderWithUser(<MealsView />);

    await user.click(
      await screen.findByRole("button", { name: "Add ingredients" }),
    );
    // Confirm the review model actually loaded the over-cap ingredient set.
    expect(
      await screen.findByDisplayValue("Ingredient 101"),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /add to list/i }));

    // The client-side guard surfaces the honest cap message.
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /up to 100 items at once/i,
    );
    // No request left the client, and no success affordance appeared.
    expect(bulkCalls).toBe(0);
    expect(
      screen.queryByRole("button", { name: /view list/i }),
    ).not.toBeInTheDocument();
    // The selection is retained and the action stays retryable.
    expect(screen.getByDisplayValue("Ingredient 101")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add to list/i })).toBeEnabled();
  });

  describe("large Home meal slot intent", () => {
    it("opens an empty dinner slot from a large Home meal intent", async () => {
      seedMockMealsBoard(createEmptyMealsBoard());
      useAppStore.getState().focusMealSlot({
        weekStartDate: testWeekStartDate,
        dayIndex: 0,
        mealType: "dinner",
      });

      renderWithUser(<MealsView />);

      expect(
        await screen.findByRole("dialog", { name: /plan dinner/i }),
      ).toBeInTheDocument();
      expect(useAppStore.getState().mealSlotIntent).toBeNull();
    });

    it("opens an occupied dinner slot from a large Home meal intent", async () => {
      seedMockMealsBoard(
        withOccupiedDinnerSlot(createEmptyMealsBoard(), 0, "Tacos"),
      );
      useAppStore.getState().focusMealSlot({
        weekStartDate: testWeekStartDate,
        dayIndex: 0,
        mealType: "dinner",
      });

      renderWithUser(<MealsView />);

      const editorDialog = await screen.findByRole("dialog", {
        name: /dinner plan/i,
      });
      expect(within(editorDialog).getByText("Tacos")).toBeInTheDocument();
      expect(useAppStore.getState().mealSlotIntent).toBeNull();
    });

    it("consumes the intent without opening a dialog when the board query errors", async () => {
      server.use(
        http.get(`${API_BASE}/meals/board`, () => {
          return HttpResponse.json(
            { message: "Internal server error" },
            { status: 500 },
          );
        }),
      );
      useAppStore.getState().focusMealSlot({
        weekStartDate: testWeekStartDate,
        dayIndex: 0,
        mealType: "dinner",
      });

      renderWithUser(<MealsView />);

      await waitFor(() => {
        expect(useAppStore.getState().mealSlotIntent).toBeNull();
      });
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});

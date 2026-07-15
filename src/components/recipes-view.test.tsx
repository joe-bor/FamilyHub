import { delay, HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  CreateRecipeRequest,
  ImportRecipeRequest,
} from "@/lib/types/recipes";
import { useBackStack } from "@/stores";
import { useAppStore } from "@/stores/app-store";
import {
  importedRecipeDetail,
  testRecipeDetail,
  testRecipeDetails,
} from "@/test/fixtures/recipes";
import {
  API_BASE,
  seedMockRecipes,
  server,
  setupMswServer,
} from "@/test/mocks/server";
import {
  act,
  render,
  renderWithUser,
  screen,
  typeAndWait,
  waitFor,
} from "@/test/test-utils";
import { RecipesView } from "./recipes-view";

const viewport = vi.hoisted(() => ({ isMobile: false }));

vi.mock("@/hooks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/hooks")>();
  return {
    ...actual,
    useIsMobile: () => viewport.isMobile,
  };
});

describe("RecipesView", () => {
  setupMswServer();

  beforeEach(() => {
    vi.restoreAllMocks();
    viewport.isMobile = false;
  });

  it("widens the container for the grid but keeps recipe detail at reading width", async () => {
    viewport.isMobile = false;
    seedMockRecipes([testRecipeDetail]);
    const { user } = renderWithUser(<RecipesView />);
    const openButton = await screen.findByRole("button", {
      name: `Open recipe: ${testRecipeDetail.title}`,
    });
    const container = screen.getByTestId("recipes-view-container");
    expect(container).toHaveClass("w-full", "max-w-3xl", "lg:max-w-[1200px]");
    await user.click(openButton);
    await screen.findByRole("button", { name: "Back to recipes" });
    const detailContainer = screen.getByTestId("recipes-view-container");
    expect(detailContainer).toHaveClass("w-full", "max-w-3xl");
    expect(detailContainer).not.toHaveClass("lg:max-w-[1200px]");
    expect(screen.queryByTestId("recipe-filter-bar")).not.toBeInTheDocument();
  });

  it("adds a recipe to meals from detail and stores a library handoff draft", async () => {
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
    seedMockRecipes([testRecipeDetail]);

    const { user } = renderWithUser(<RecipesView />);

    await user.click(
      await screen.findByRole("button", {
        name: `Open recipe: ${testRecipeDetail.title}`,
      }),
    );
    await user.click(screen.getByRole("button", { name: "Add to Meals" }));

    expect(useAppStore.getState().activeModule).toBe("meals");
    expect(useAppStore.getState().mealPlacementDraft).toEqual({
      recipeId: testRecipeDetail.id,
      requestedAtWeekStartDate: "2026-06-07",
      source: { kind: "recipes-library" },
    });

    vi.unstubAllGlobals();
  });

  it("shows a loading state while the recipe library is fetching", async () => {
    seedMockRecipes([testRecipeDetail]);
    server.use(
      http.get(`${API_BASE}/recipes`, async () => {
        await delay(200);
        return HttpResponse.json({
          data: [testRecipeDetail].map((recipe) => ({
            id: recipe.id,
            title: recipe.title,
            imageUrl: recipe.imageUrl,
            favorite: recipe.favorite,
            tags: recipe.tags,
            updatedAt: recipe.updatedAt,
          })),
        });
      }),
    );

    const { container } = render(<RecipesView />);

    expect(screen.getByText("Loading recipes...")).toBeInTheDocument();
    expect(screen.queryByText(testRecipeDetail.title)).not.toBeInTheDocument();
    expect(container.querySelector(".animate-pulse")).toHaveClass(
      "size-24",
      "shrink-0",
      "md:aspect-[4/3]",
      "md:w-full",
    );
    expect(await screen.findByText(testRecipeDetail.title)).toBeInTheDocument();
  });

  it("shows an error state with retry when the library request fails", async () => {
    seedMockRecipes([testRecipeDetail]);
    const getRecipes = vi.fn(() =>
      HttpResponse.json({ message: "Server error" }, { status: 500 }),
    );
    server.use(http.get(`${API_BASE}/recipes`, getRecipes));

    const { user } = renderWithUser(<RecipesView />);

    expect(
      await screen.findByText("Recipes could not be loaded"),
    ).toBeInTheDocument();

    server.use(
      http.get(`${API_BASE}/recipes`, () =>
        HttpResponse.json({
          data: [testRecipeDetail].map((recipe) => ({
            id: recipe.id,
            title: recipe.title,
            imageUrl: recipe.imageUrl,
            favorite: recipe.favorite,
            tags: recipe.tags,
            updatedAt: recipe.updatedAt,
          })),
        }),
      ),
    );

    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByText(testRecipeDetail.title)).toBeInTheDocument();
    expect(getRecipes).toHaveBeenCalledTimes(1);
  });

  it("shows an empty state that invites adding the first recipe", async () => {
    seedMockRecipes([]);

    render(<RecipesView />);

    expect(await screen.findByText("No recipes yet")).toBeInTheDocument();
    expect(
      screen.getByText("Add your first recipe to get started."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add recipe" })).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Import from URL" }),
    ).not.toBeInTheDocument();
  });

  it("centers the empty state within the widened library", async () => {
    viewport.isMobile = false;
    seedMockRecipes([]);
    render(<RecipesView />);
    const heading = await screen.findByText("No recipes yet");
    const panel = heading.closest("div");
    expect(panel).toHaveClass("mx-auto");
    expect(panel).toHaveClass("w-full");
    expect(panel).toHaveClass("max-w-xl");
  });

  it("centers the no-results state within the widened library", async () => {
    viewport.isMobile = false;
    seedMockRecipes([testRecipeDetail]);
    const { user } = renderWithUser(<RecipesView />);
    await screen.findByRole("article", {
      name: "Recipe card: Sheet Pan Salmon",
    });
    await user.type(
      screen.getByRole("searchbox", { name: "Search recipes" }),
      "definitely-not-a-recipe",
    );
    const heading = await screen.findByText("No recipes match those filters");
    const panel = heading.closest("div");
    expect(panel).toHaveClass("mx-auto");
    expect(panel).toHaveClass("w-full");
    expect(panel).toHaveClass("max-w-xl");
  });

  it("renders summary cards with image, title, tags, and favorite state", async () => {
    seedMockRecipes([testRecipeDetail, importedRecipeDetail]);

    render(<RecipesView />);

    expect(
      await screen.findByRole("article", {
        name: "Recipe card: Sheet Pan Salmon",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: testRecipeDetail.title }),
    ).toHaveAttribute("src", testRecipeDetail.imageUrl);
    expect(screen.getAllByText("dinner").length).toBeGreaterThan(0);
    expect(screen.getAllByText("quick").length).toBeGreaterThan(0);
    expect(
      screen.getByLabelText(`${testRecipeDetail.title} is a favorite`),
    ).toBeInTheDocument();
    expect(
      screen.getByText("No photo", { selector: "span" }),
    ).toBeInTheDocument();
  });

  it("lays the large-screen library out as a responsive card grid", async () => {
    viewport.isMobile = false;
    seedMockRecipes([testRecipeDetail, importedRecipeDetail]);
    render(<RecipesView />);
    await screen.findByRole("article", {
      name: "Recipe card: Sheet Pan Salmon",
    });
    const grid = screen.getByTestId("recipe-library-grid");
    expect(grid).toHaveClass("grid-cols-1");
    expect(grid).toHaveClass("lg:grid-cols-2");
    expect(grid).toHaveClass("xl:grid-cols-3");
    expect(grid).toHaveClass("min-[1440px]:grid-cols-4!");
  });

  it("composes the large-screen controls into one foundations toolbar", async () => {
    viewport.isMobile = false;
    seedMockRecipes([testRecipeDetail, importedRecipeDetail]);
    render(<RecipesView />);
    await screen.findByRole("article", {
      name: "Recipe card: Sheet Pan Salmon",
    });
    const toolbar = screen.getByTestId("recipes-desktop-toolbar");
    const search = screen.getByRole("searchbox", { name: "Search recipes" });
    const favorites = screen.getByRole("button", { name: "Favorites only" });
    const add = screen.getByRole("button", { name: "Add recipe" });
    expect(toolbar).toHaveClass("lg:flex-nowrap");
    expect(toolbar).toContainElement(search);
    expect(toolbar).toContainElement(favorites);
    expect(toolbar).toContainElement(add);
    expect(screen.getAllByTestId("recipe-filter-bar")).toHaveLength(1);
    expect(screen.getByTestId("recipe-filter-bar")).toHaveClass("lg:flex");
    expect(search).toHaveClass("lg:h-11");
    expect(favorites).toHaveClass("lg:min-h-11");
    expect(add).toHaveClass("lg:min-h-11");
  });

  it("opens recipe detail from the library with cook-first content order and returns back", async () => {
    seedMockRecipes([testRecipeDetail, importedRecipeDetail]);

    const { user } = renderWithUser(<RecipesView />);

    await user.click(
      await screen.findByRole("button", {
        name: `Open recipe: ${testRecipeDetail.title}`,
      }),
    );

    const image = screen.getByRole("img", { name: testRecipeDetail.title });
    const title = screen.getByRole("heading", { name: testRecipeDetail.title });
    const ingredientsHeading = screen.getByRole("heading", {
      name: "Ingredients",
    });
    const instructionsHeading = screen.getByRole("heading", {
      name: "Instructions",
    });
    const backButton = screen.getByRole("button", { name: "Back to recipes" });
    const editButton = screen.getByRole("button", { name: "Edit recipe" });

    expect(screen.getByText("Salmon fillets")).toBeInTheDocument();
    expect(screen.getByText("Heat oven to 425F")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View source" })).toHaveAttribute(
      "href",
      testRecipeDetail.sourceUrl,
    );

    expect(
      image.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      title.compareDocumentPosition(ingredientsHeading) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      ingredientsHeading.compareDocumentPosition(instructionsHeading) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      instructionsHeading.compareDocumentPosition(backButton) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      backButton.compareDocumentPosition(editButton) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Back to recipes" }));

    expect(
      await screen.findByRole("button", {
        name: `Open recipe: ${testRecipeDetail.title}`,
      }),
    ).toBeInTheDocument();
  });

  it("renders recipe detail gracefully when optional image and cook steps are missing", async () => {
    seedMockRecipes([
      {
        ...importedRecipeDetail,
        ingredients: [],
        instructions: [],
        sourceUrl: null,
      },
    ]);

    const { user } = renderWithUser(<RecipesView />);

    await user.click(
      await screen.findByRole("button", {
        name: `Open recipe: ${importedRecipeDetail.title}`,
      }),
    );

    expect(
      screen.getByRole("heading", { name: importedRecipeDetail.title }),
    ).toBeInTheDocument();
    expect(screen.getByText("No photo", { selector: "span" })).toBeVisible();
    expect(
      screen.queryByRole("heading", { name: "Ingredients" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Instructions" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "View source" }),
    ).not.toBeInTheDocument();
  });

  it("renders duplicate ordered recipe lines without duplicate React key warnings", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    seedMockRecipes([
      {
        ...testRecipeDetail,
        ingredients: ["Salt", "Salt"],
        instructions: ["Mix", "Mix"],
        tags: ["quick", "quick"],
      },
    ]);

    const { user } = renderWithUser(<RecipesView />);

    await user.click(
      await screen.findByRole("button", {
        name: `Open recipe: ${testRecipeDetail.title}`,
      }),
    );

    expect(screen.getAllByText("Salt")).toHaveLength(2);
    expect(screen.getAllByText("Mix")).toHaveLength(2);
    expect(
      consoleError.mock.calls.some((call) =>
        call.some(
          (arg) =>
            typeof arg === "string" &&
            arg.includes("Encountered two children with the same key"),
        ),
      ),
    ).toBe(false);
  });

  it("lets users recover when recipe detail loading fails", async () => {
    seedMockRecipes([testRecipeDetail]);
    const getDetail = vi.fn(() =>
      HttpResponse.json({ message: "Detail request failed" }, { status: 500 }),
    );
    server.use(
      http.get(`${API_BASE}/recipes/${testRecipeDetail.id}`, getDetail),
    );

    const { user } = renderWithUser(<RecipesView />);

    await user.click(
      await screen.findByRole("button", {
        name: `Open recipe: ${testRecipeDetail.title}`,
      }),
    );

    expect(
      await screen.findByText("Recipe could not be loaded"),
    ).toBeInTheDocument();
    expect(screen.getByText("Detail request failed")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Back to recipes" }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Retry" })).toBeVisible();

    server.use(
      http.get(`${API_BASE}/recipes/${testRecipeDetail.id}`, () =>
        HttpResponse.json({ data: testRecipeDetail }),
      ),
    );

    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(
      await screen.findByRole("heading", { name: testRecipeDetail.title }),
    ).toBeInTheDocument();
    expect(getDetail).toHaveBeenCalledTimes(1);
  });

  it("matches recipes by title and tags when searching", async () => {
    seedMockRecipes(testRecipeDetails);

    const { user } = renderWithUser(<RecipesView />);

    await screen.findByText("Sheet Pan Salmon");
    await user.type(
      screen.getByRole("searchbox", { name: "Search recipes" }),
      "lunch",
    );

    expect(screen.getByText("Imported Tomato Soup")).toBeInTheDocument();
    expect(screen.queryByText("Sheet Pan Salmon")).not.toBeInTheDocument();

    await user.clear(screen.getByRole("searchbox", { name: "Search recipes" }));
    await user.type(
      screen.getByRole("searchbox", { name: "Search recipes" }),
      "salmon",
    );

    expect(screen.getByText("Sheet Pan Salmon")).toBeInTheDocument();
    expect(screen.queryByText("Imported Tomato Soup")).not.toBeInTheDocument();
  });

  it("shows only favorites when the favorites filter is enabled", async () => {
    seedMockRecipes(testRecipeDetails);

    const { user } = renderWithUser(<RecipesView />);

    await screen.findByText("Sheet Pan Salmon");
    await user.click(screen.getByRole("button", { name: "Favorites only" }));

    expect(screen.getByText("Sheet Pan Salmon")).toBeInTheDocument();
    expect(screen.getByText("Berry Yogurt Parfaits")).toBeInTheDocument();
    expect(screen.queryByText("Imported Tomato Soup")).not.toBeInTheDocument();
  });

  it("sorts favorites ahead of non-favorites in browse and search results", async () => {
    seedMockRecipes(testRecipeDetails);

    const { user } = renderWithUser(<RecipesView />);

    const getTitles = () =>
      screen
        .getAllByRole("article", { name: /recipe card:/i })
        .map((card) => card.getAttribute("aria-label"));

    await screen.findByText("Sheet Pan Salmon");

    expect(getTitles()).toEqual([
      "Recipe card: Berry Yogurt Parfaits",
      "Recipe card: Sheet Pan Salmon",
      "Recipe card: Imported Tomato Soup",
    ]);

    await user.type(
      screen.getByRole("searchbox", { name: "Search recipes" }),
      "quick",
    );

    expect(getTitles()).toEqual([
      "Recipe card: Sheet Pan Salmon",
      "Recipe card: Imported Tomato Soup",
    ]);
  });

  it("orders the library by most recent activity by default, favorites-first only when searching", async () => {
    const olderFavorite = {
      ...testRecipeDetail,
      id: "00000000-0000-4000-8000-000000000901",
      title: "Older Favorite",
      favorite: true,
      tags: ["weeknight"],
      updatedAt: "2026-06-01T08:00:00",
    };
    const newerPlain = {
      ...testRecipeDetail,
      id: "00000000-0000-4000-8000-000000000902",
      title: "Newer Plain",
      favorite: false,
      tags: ["weeknight"],
      updatedAt: "2026-06-05T08:00:00",
    };
    seedMockRecipes([olderFavorite, newerPlain]);

    const { user } = renderWithUser(<RecipesView />);

    const getTitles = () =>
      screen
        .getAllByRole("article", { name: /recipe card:/i })
        .map((card) => card.getAttribute("aria-label"));

    await screen.findByText("Newer Plain");

    // Default browse is recency-first even though the older recipe is favorited.
    expect(getTitles()).toEqual([
      "Recipe card: Newer Plain",
      "Recipe card: Older Favorite",
    ]);

    await user.type(
      screen.getByRole("searchbox", { name: "Search recipes" }),
      "weeknight",
    );

    // Searching surfaces favorites first.
    expect(getTitles()).toEqual([
      "Recipe card: Older Favorite",
      "Recipe card: Newer Plain",
    ]);
  });

  it("filters the library by tag chip", async () => {
    seedMockRecipes(testRecipeDetails);

    const { user } = renderWithUser(<RecipesView />);

    await screen.findByText("Sheet Pan Salmon");
    await user.click(screen.getByRole("button", { name: "breakfast" }));

    expect(screen.getByText("Berry Yogurt Parfaits")).toBeInTheDocument();
    expect(screen.queryByText("Sheet Pan Salmon")).not.toBeInTheDocument();
    expect(screen.queryByText("Imported Tomato Soup")).not.toBeInTheDocument();
  });

  it("normalizes tag chips and filtering across casing and whitespace", async () => {
    seedMockRecipes([
      {
        ...testRecipeDetail,
        tags: [" Quick ", "Dinner"],
      },
      {
        ...importedRecipeDetail,
        tags: ["quick", "lunch"],
      },
    ]);

    const { user } = renderWithUser(<RecipesView />);

    await screen.findByText("Sheet Pan Salmon");

    expect(screen.getAllByRole("button", { name: "quick" })).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: "quick" }));

    expect(screen.getByText("Sheet Pan Salmon")).toBeInTheDocument();
    expect(screen.getByText("Imported Tomato Soup")).toBeInTheDocument();
  });

  it("shows an 'Add your first recipe' button in the empty card that opens the chooser", async () => {
    seedMockRecipes([]);

    const { user } = renderWithUser(<RecipesView />);

    await screen.findByText("No recipes yet");

    const emptyCardButton = screen.getByRole("button", {
      name: "Add your first recipe",
    });
    expect(emptyCardButton).toBeVisible();

    await user.click(emptyCardButton);

    expect(
      await screen.findByRole("dialog", { name: "Add Recipe" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create manually" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Import from URL" }),
    ).toBeVisible();
  });

  it("opens the add flow with manual and import choices", async () => {
    seedMockRecipes(testRecipeDetails);

    const { user } = renderWithUser(<RecipesView />);

    await screen.findByRole("article", {
      name: "Recipe card: Sheet Pan Salmon",
    });

    expect(
      screen.queryByRole("button", { name: "Import from URL" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Add recipe" }));

    expect(
      screen.getByRole("dialog", { name: "Add Recipe" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create manually" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Import from URL" }),
    ).toBeVisible();
  });

  it("creates a recipe manually with only a title and lands on its saved detail", async () => {
    seedMockRecipes([]);

    const { user } = renderWithUser(<RecipesView />);

    await screen.findByText("No recipes yet");
    await user.click(screen.getByRole("button", { name: "Add recipe" }));
    await user.click(screen.getByRole("button", { name: "Create manually" }));
    await typeAndWait(user, screen.getByLabelText("Title"), "Skillet Eggs");
    await user.click(screen.getByRole("button", { name: "Save recipe" }));

    expect(
      await screen.findByRole("heading", { name: "Skillet Eggs" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Back to recipes" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("dialog", { name: "Add Recipe" }),
    ).not.toBeInTheDocument();
  });

  it("opens the chooser from a meals draft so URL import is reachable", async () => {
    seedMockRecipes([]);
    useAppStore.getState().startRecipeCreationFromMealSlot({
      requestedAtWeekStartDate: "2026-06-07",
      dayIndex: 3,
      mealType: "dinner",
      typedTitle: "Skillet Eggs",
    });

    renderWithUser(<RecipesView />);

    // The chooser (Add Recipe) must open — not jump straight to manual mode.
    expect(
      await screen.findByRole("dialog", { name: "Add Recipe" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create manually" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Import from URL" }),
    ).toBeVisible();
    // The manual form must NOT be visible yet.
    expect(screen.queryByLabelText("Title")).not.toBeInTheDocument();
  });

  it("picking Create manually from the meals-draft chooser prefills the title and returns to meals after save", async () => {
    seedMockRecipes([]);
    useAppStore.getState().startRecipeCreationFromMealSlot({
      requestedAtWeekStartDate: "2026-06-07",
      dayIndex: 3,
      mealType: "dinner",
      typedTitle: "Skillet Eggs",
    });

    const { user } = renderWithUser(<RecipesView />);

    // Wait for the chooser to open.
    await screen.findByRole("dialog", { name: "Add Recipe" });
    await user.click(screen.getByRole("button", { name: "Create manually" }));

    // Switching to manual mode should prefill the title from the draft.
    expect(
      await screen.findByRole("dialog", { name: "Create Recipe" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Title")).toHaveValue("Skillet Eggs");

    await user.click(screen.getByRole("button", { name: "Save recipe" }));

    expect(useAppStore.getState().activeModule).toBe("meals");
    expect(useAppStore.getState().recipeCreationDraft).toBe(null);
    expect(useAppStore.getState().mealPlacementDraft).toEqual({
      recipeId: "00000000-0000-4000-8000-000000001001",
      requestedAtWeekStartDate: "2026-06-07",
      source: {
        kind: "meals-slot",
        dayIndex: 3,
        mealType: "dinner",
      },
    });
  });

  it("importing from URL via the meals-draft chooser returns to meals with a slot handoff", async () => {
    seedMockRecipes([]);
    useAppStore.getState().startRecipeCreationFromMealSlot({
      requestedAtWeekStartDate: "2026-06-07",
      dayIndex: 2,
      mealType: "lunch",
      typedTitle: "Soup idea",
    });

    const { user } = renderWithUser(<RecipesView />);

    // Chooser opens.
    await screen.findByRole("dialog", { name: "Add Recipe" });
    await user.click(screen.getByRole("button", { name: "Import from URL" }));

    // Import sheet appears.
    await typeAndWait(
      user,
      screen.getByLabelText("Recipe URL"),
      "https://example.com/imported-soup",
    );
    await user.click(screen.getByRole("button", { name: "Import recipe" }));

    // After a successful import the app returns to Meals with the placement draft.
    expect(useAppStore.getState().activeModule).toBe("meals");
    expect(useAppStore.getState().recipeCreationDraft).toBe(null);
    expect(useAppStore.getState().mealPlacementDraft).toEqual({
      recipeId: "00000000-0000-4000-8000-000000000502",
      requestedAtWeekStartDate: "2026-06-07",
      source: {
        kind: "meals-slot",
        dayIndex: 2,
        mealType: "lunch",
      },
    });
  });

  it("dismissing the chooser directly (without entering manual) clears the meals draft", async () => {
    seedMockRecipes([]);
    useAppStore.getState().startRecipeCreationFromMealSlot({
      requestedAtWeekStartDate: "2026-06-07",
      dayIndex: 3,
      mealType: "dinner",
      typedTitle: "Skillet Eggs",
    });

    const { user } = renderWithUser(<RecipesView />);

    // Chooser opens (not manual mode).
    expect(
      await screen.findByRole("dialog", { name: "Add Recipe" }),
    ).toBeInTheDocument();

    // Cancel directly on the chooser — without drilling into "Create manually".
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    // The draft must be consumed so it cannot stale-prefill a future create.
    expect(useAppStore.getState().recipeCreationDraft).toBe(null);
    // The dialog must be gone.
    expect(
      screen.queryByRole("dialog", { name: "Add Recipe" }),
    ).not.toBeInTheDocument();
  });

  it("dismissing the meals-draft chooser clears the draft without leaving stale handoff state", async () => {
    seedMockRecipes([]);
    useAppStore.getState().startRecipeCreationFromMealSlot({
      requestedAtWeekStartDate: "2026-06-07",
      dayIndex: 2,
      mealType: "lunch",
      typedTitle: "Soup idea",
    });

    const { user } = renderWithUser(<RecipesView />);

    // Chooser opens (not manual mode).
    expect(
      await screen.findByRole("dialog", { name: "Add Recipe" }),
    ).toBeInTheDocument();

    // Navigate into manual mode then cancel — onCancel fires and clears
    // the draft.
    await user.click(screen.getByRole("button", { name: "Create manually" }));
    await screen.findByRole("dialog", { name: "Create Recipe" });
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(useAppStore.getState().recipeCreationDraft).toBe(null);
    expect(useAppStore.getState().mealPlacementDraft).toBe(null);
    expect(useAppStore.getState().activeModule).toBe("recipes");
    expect(
      screen.queryByRole("dialog", { name: "Create Recipe" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("dialog", { name: "Add Recipe" }),
    ).not.toBeInTheDocument();
  });

  it("shows a manual create error without selecting a partial recipe", async () => {
    seedMockRecipes([]);
    server.use(
      http.post(`${API_BASE}/recipes`, () =>
        HttpResponse.json(
          { message: "Recipe title already exists" },
          { status: 409 },
        ),
      ),
    );

    const { user } = renderWithUser(<RecipesView />);

    await screen.findByText("No recipes yet");
    await user.click(screen.getByRole("button", { name: "Add recipe" }));
    await user.click(screen.getByRole("button", { name: "Create manually" }));
    await typeAndWait(user, screen.getByLabelText("Title"), "Skillet Eggs");
    await user.click(screen.getByRole("button", { name: "Save recipe" }));

    expect(
      await screen.findByText("Recipe title already exists"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("dialog", { name: "Create Recipe" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Back to recipes" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Skillet Eggs" }),
    ).not.toBeInTheDocument();
  });

  it("preserves ordered manual ingredients, instructions, and tags when saving", async () => {
    seedMockRecipes([]);

    const createRecipe = vi.fn(async ({ request }) => {
      const body = (await request.json()) as CreateRecipeRequest;

      expect(body).toMatchObject({
        title: "Layered Salad",
        imageUrl: "https://example.com/layered-salad.jpg",
        ingredients: ["lettuce", "dressing", "seeds"],
        instructions: ["wash", "stack", "serve"],
        note: "Best chilled before dinner",
        sourceUrl: "https://example.com/layered-salad",
        tags: ["make-ahead", "side", "summer"],
      });

      return HttpResponse.json({
        data: {
          id: "00000000-0000-4000-8000-000000000599",
          title: body.title,
          imageUrl: body.imageUrl ?? null,
          ingredients: body.ingredients ?? [],
          instructions: body.instructions ?? [],
          note: body.note ?? null,
          sourceUrl: body.sourceUrl ?? null,
          tags: body.tags ?? [],
          favorite: false,
          updatedAt: "2026-06-04T10:00:00",
        },
      });
    });

    server.use(http.post(`${API_BASE}/recipes`, createRecipe));

    const { user } = renderWithUser(<RecipesView />);

    await screen.findByText("No recipes yet");
    await user.click(screen.getByRole("button", { name: "Add recipe" }));
    await user.click(screen.getByRole("button", { name: "Create manually" }));

    await typeAndWait(user, screen.getByLabelText("Title"), "Layered Salad");
    await typeAndWait(
      user,
      screen.getByLabelText("Image URL"),
      "https://example.com/layered-salad.jpg",
    );
    await typeAndWait(
      user,
      screen.getByLabelText("Note"),
      "Best chilled before dinner",
    );
    await typeAndWait(
      user,
      screen.getByLabelText("Source URL"),
      "https://example.com/layered-salad",
    );
    await typeAndWait(user, screen.getByLabelText("Ingredient 1"), " lettuce ");
    await typeAndWait(
      user,
      screen.getByLabelText("Ingredient 2"),
      " dressing ",
    );
    await user.click(screen.getByRole("button", { name: "Add ingredient" }));
    await typeAndWait(user, screen.getByLabelText("Ingredient 3"), " seeds ");

    await typeAndWait(user, screen.getByLabelText("Instruction 1"), " wash ");
    await typeAndWait(user, screen.getByLabelText("Instruction 2"), " stack ");
    await user.click(screen.getByRole("button", { name: "Add instruction" }));
    await typeAndWait(user, screen.getByLabelText("Instruction 3"), " serve ");

    await typeAndWait(user, screen.getByLabelText("Tag 1"), " make-ahead ");
    await typeAndWait(user, screen.getByLabelText("Tag 2"), " side ");
    await user.click(screen.getByRole("button", { name: "Add tag" }));
    await typeAndWait(user, screen.getByLabelText("Tag 3"), " summer ");

    await user.click(screen.getByRole("button", { name: "Save recipe" }));

    expect(
      await screen.findByRole("heading", { name: "Layered Salad" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Best chilled before dinner")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View source" })).toHaveAttribute(
      "href",
      "https://example.com/layered-salad",
    );
    expect(createRecipe).toHaveBeenCalledTimes(1);
  });

  it("shows validation messages for long ingredients and tags", async () => {
    seedMockRecipes([]);

    const { user } = renderWithUser(<RecipesView />);

    await screen.findByText("No recipes yet");
    await user.click(screen.getByRole("button", { name: "Add recipe" }));
    await user.click(screen.getByRole("button", { name: "Create manually" }));
    await typeAndWait(user, screen.getByLabelText("Title"), "Big Recipe");
    await typeAndWait(
      user,
      screen.getByLabelText("Ingredient 1"),
      "a".repeat(501),
    );
    await typeAndWait(user, screen.getByLabelText("Tag 1"), "c".repeat(61));
    await user.click(screen.getByRole("button", { name: "Save recipe" }));

    expect(
      await screen.findByText("Ingredient must be 500 characters or less"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Tag must be 60 characters or less"),
    ).toBeInTheDocument();
  });

  it("imports a recipe from url through the add flow and lands on its saved detail", async () => {
    seedMockRecipes([]);

    const importRecipe = vi.fn(async ({ request }) => {
      const body = (await request.json()) as ImportRecipeRequest;

      expect(body).toEqual({
        url: "https://example.com/roasted-carrots",
      });

      return HttpResponse.json({
        data: {
          ...importedRecipeDetail,
          id: "00000000-0000-4000-8000-000000000601",
          title: "Roasted Carrots",
          sourceUrl: body.url,
        },
      });
    });

    server.use(http.post(`${API_BASE}/recipes/import`, importRecipe));

    const { user } = renderWithUser(<RecipesView />);

    await screen.findByText("No recipes yet");
    await user.click(screen.getByRole("button", { name: "Add recipe" }));
    await user.click(screen.getByRole("button", { name: "Import from URL" }));
    await typeAndWait(
      user,
      screen.getByLabelText("Recipe URL"),
      "https://example.com/roasted-carrots",
    );
    await user.click(screen.getByRole("button", { name: "Import recipe" }));

    expect(
      await screen.findByRole("heading", { name: "Roasted Carrots" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Back to recipes" }),
    ).toBeVisible();
    expect(importRecipe).toHaveBeenCalledTimes(1);
  });

  it("gives recipe cards press feedback", async () => {
    seedMockRecipes([testRecipeDetail]);
    render(<RecipesView />);
    expect(
      (
        await screen.findByRole("article", {
          name: `Recipe card: ${testRecipeDetail.title}`,
        })
      ).className,
    ).toContain("active:scale-[0.97]");
  });

  it("slides the recipe detail right on open and back-left on close", async () => {
    const animateMock = vi.fn();
    (Element.prototype as unknown as { animate: unknown }).animate =
      animateMock;
    seedMockRecipes([testRecipeDetail]);

    const { user } = renderWithUser(<RecipesView />);

    await user.click(
      await screen.findByRole("button", {
        name: `Open recipe: ${testRecipeDetail.title}`,
      }),
    );
    expect(animateMock.mock.calls.at(-1)?.[0][0].transform).toBe(
      "translateX(22%)",
    );

    await user.click(
      await screen.findByRole("button", { name: "Back to recipes" }),
    );
    expect(animateMock.mock.calls.at(-1)?.[0][0].transform).toBe(
      "translateX(-22%)",
    );
  });

  it("shows an import error without selecting a partial recipe", async () => {
    seedMockRecipes([]);

    const { user } = renderWithUser(<RecipesView />);

    await screen.findByText("No recipes yet");
    await user.click(screen.getByRole("button", { name: "Add recipe" }));
    await user.click(screen.getByRole("button", { name: "Import from URL" }));
    await typeAndWait(
      user,
      screen.getByLabelText("Recipe URL"),
      "https://example.com/import-error",
    );
    await user.click(screen.getByRole("button", { name: "Import recipe" }));

    expect(
      await screen.findByText("Could not import recipe"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("dialog", { name: "Import Recipe" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Back to recipes" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: importedRecipeDetail.title }),
    ).not.toBeInTheDocument();
  });

  it("registers a back handler that closes the open recipe detail", async () => {
    seedMockRecipes([testRecipeDetail]);
    const { user } = renderWithUser(<RecipesView />);
    await user.click(
      await screen.findByRole("button", {
        name: `Open recipe: ${testRecipeDetail.title}`,
      }),
    );
    expect(useBackStack.getState().stack).toHaveLength(1);
    act(() => {
      useBackStack.getState().peek()?.handler();
    });
    expect(
      await screen.findByRole("button", { name: /add recipe/i }),
    ).toBeInTheDocument();
  });

  describe("RecipesView create action placement", () => {
    it("shows the Add recipe FAB in the mobile library", async () => {
      viewport.isMobile = true;
      seedMockRecipes([testRecipeDetail]);
      renderWithUser(<RecipesView />);
      await screen.findByRole("button", {
        name: `Open recipe: ${testRecipeDetail.title}`,
      });
      const fab = screen.getByRole("button", { name: "Add recipe" });
      expect(screen.getAllByTestId("recipe-filter-bar")).toHaveLength(1);
      expect(fab).toHaveClass("fixed");
    });

    it("keeps the inline Add recipe button (not a FAB) on the desktop library", async () => {
      viewport.isMobile = false;
      seedMockRecipes([testRecipeDetail]);
      renderWithUser(<RecipesView />);
      await screen.findByRole("button", {
        name: `Open recipe: ${testRecipeDetail.title}`,
      });
      const controls = screen.getAllByRole("button", { name: "Add recipe" });
      expect(controls).toHaveLength(1);
      expect(controls[0]).not.toHaveClass("fixed");
    });

    it("shows no Add recipe FAB when viewing a recipe on mobile", async () => {
      viewport.isMobile = true;
      seedMockRecipes([testRecipeDetail]);
      const { user } = renderWithUser(<RecipesView />);
      await user.click(
        await screen.findByRole("button", {
          name: `Open recipe: ${testRecipeDetail.title}`,
        }),
      );
      await waitFor(() => {
        expect(
          screen.queryByRole("button", { name: "Add recipe" }),
        ).not.toBeInTheDocument();
      });
    });
  });

  it("toggles favorite from detail and updates the visible saved state", async () => {
    seedMockRecipes([importedRecipeDetail]);
    const updateRecipe = vi.fn(async ({ request }) => {
      const body = await request.json();

      expect(body).toEqual({ favorite: true });

      return HttpResponse.json({
        data: {
          ...importedRecipeDetail,
          favorite: true,
        },
      });
    });
    server.use(
      http.patch(
        `${API_BASE}/recipes/${importedRecipeDetail.id}`,
        updateRecipe,
      ),
    );

    const { user } = renderWithUser(<RecipesView />);

    await user.click(
      await screen.findByRole("button", {
        name: `Open recipe: ${importedRecipeDetail.title}`,
      }),
    );

    const favoriteButton = screen.getByRole("button", {
      name: `Favorite recipe: ${importedRecipeDetail.title}`,
    });
    expect(favoriteButton).toHaveAttribute("aria-pressed", "false");

    await user.click(favoriteButton);

    expect(await screen.findByText("Favorited")).toBeInTheDocument();
    expect(updateRecipe).toHaveBeenCalledTimes(1);
    expect(favoriteButton).toHaveAttribute("aria-pressed", "true");
  });

  it("opens edit with existing values and saves ordered fields back to the recipe", async () => {
    seedMockRecipes([testRecipeDetail]);
    const updateRecipe = vi.fn(async ({ request }) => {
      const body = await request.json();

      expect(body).toEqual({
        title: "Sheet Pan Salmon with Dill",
        imageUrl: "https://example.com/salmon-dill.jpg",
        ingredients: [
          "Salmon fillets",
          "Asparagus",
          "Lemon slices",
          "Fresh dill",
        ],
        instructions: [
          "Heat oven to 425F",
          "Roast salmon and asparagus together",
          "Finish with dill",
        ],
        note: "Add extra dill before serving",
        sourceUrl: "https://example.com/salmon-dill",
        tags: ["dinner", "quick", "sheet-pan"],
        favorite: testRecipeDetail.favorite,
      });

      return HttpResponse.json({
        data: {
          ...testRecipeDetail,
          title: "Sheet Pan Salmon with Dill",
          imageUrl: "https://example.com/salmon-dill.jpg",
          ingredients: [
            "Salmon fillets",
            "Asparagus",
            "Lemon slices",
            "Fresh dill",
          ],
          instructions: [
            "Heat oven to 425F",
            "Roast salmon and asparagus together",
            "Finish with dill",
          ],
          note: "Add extra dill before serving",
          sourceUrl: "https://example.com/salmon-dill",
          tags: ["dinner", "quick", "sheet-pan"],
        },
      });
    });
    server.use(
      http.patch(`${API_BASE}/recipes/${testRecipeDetail.id}`, updateRecipe),
    );

    const { user } = renderWithUser(<RecipesView />);

    await user.click(
      await screen.findByRole("button", {
        name: `Open recipe: ${testRecipeDetail.title}`,
      }),
    );
    await user.click(screen.getByRole("button", { name: "Edit recipe" }));

    expect(
      screen.getByRole("dialog", { name: "Edit Recipe" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Title")).toHaveValue(testRecipeDetail.title);
    expect(screen.getByLabelText("Image URL")).toHaveValue(
      testRecipeDetail.imageUrl,
    );
    expect(screen.getByLabelText("Note")).toHaveValue(testRecipeDetail.note);
    expect(screen.getByLabelText("Source URL")).toHaveValue(
      testRecipeDetail.sourceUrl,
    );
    expect(screen.getByLabelText("Ingredient 1")).toHaveValue(
      testRecipeDetail.ingredients[0],
    );
    expect(screen.getByLabelText("Instruction 2")).toHaveValue(
      testRecipeDetail.instructions[1],
    );
    expect(screen.getByLabelText("Tag 2")).toHaveValue(
      testRecipeDetail.tags[1],
    );

    await user.clear(screen.getByLabelText("Title"));
    await typeAndWait(
      user,
      screen.getByLabelText("Title"),
      "Sheet Pan Salmon with Dill",
    );
    await user.clear(screen.getByLabelText("Image URL"));
    await typeAndWait(
      user,
      screen.getByLabelText("Image URL"),
      "https://example.com/salmon-dill.jpg",
    );
    await user.clear(screen.getByLabelText("Note"));
    await typeAndWait(
      user,
      screen.getByLabelText("Note"),
      "Add extra dill before serving",
    );
    await user.clear(screen.getByLabelText("Source URL"));
    await typeAndWait(
      user,
      screen.getByLabelText("Source URL"),
      "https://example.com/salmon-dill",
    );
    await user.clear(screen.getByLabelText("Ingredient 3"));
    await typeAndWait(
      user,
      screen.getByLabelText("Ingredient 3"),
      "Lemon slices",
    );
    await user.click(screen.getByRole("button", { name: "Add ingredient" }));
    await typeAndWait(
      user,
      screen.getByLabelText("Ingredient 4"),
      "Fresh dill",
    );
    await user.clear(screen.getByLabelText("Instruction 2"));
    await typeAndWait(
      user,
      screen.getByLabelText("Instruction 2"),
      "Roast salmon and asparagus together",
    );
    await user.click(screen.getByRole("button", { name: "Add instruction" }));
    await typeAndWait(
      user,
      screen.getByLabelText("Instruction 3"),
      "Finish with dill",
    );
    await user.click(screen.getByRole("button", { name: "Add tag" }));
    await typeAndWait(user, screen.getByLabelText("Tag 3"), "sheet-pan");
    await user.click(screen.getByRole("button", { name: "Save recipe" }));

    expect(
      await screen.findByRole("heading", {
        name: "Sheet Pan Salmon with Dill",
      }),
    ).toBeInTheDocument();
    expect(updateRecipe).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByRole("dialog", { name: "Edit Recipe" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Fresh dill")).toBeInTheDocument();
    expect(screen.getByText("Finish with dill")).toBeInTheDocument();
    expect(
      screen.getByText("Add extra dill before serving"),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View source" })).toHaveAttribute(
      "href",
      "https://example.com/salmon-dill",
    );
    expect(screen.getByText("sheet-pan")).toBeInTheDocument();
  });
});

import { delay, HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
import { render, renderWithUser, screen } from "@/test/test-utils";
import { RecipesView } from "./recipes-view";

describe("RecipesView", () => {
  setupMswServer();

  beforeEach(() => {
    vi.restoreAllMocks();
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

    render(<RecipesView />);

    expect(screen.getByText("Loading recipes...")).toBeInTheDocument();
    expect(screen.queryByText(testRecipeDetail.title)).not.toBeInTheDocument();
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
    expect(
      screen.queryByRole("button", { name: "Add recipe" }),
    ).not.toBeInTheDocument();
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
      screen.getByLabelText(`Favorite recipe: ${testRecipeDetail.title}`),
    ).toBeInTheDocument();
    expect(
      screen.getByText("No photo", { selector: "span" }),
    ).toBeInTheDocument();
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

  it("does not expose unfinished create or detail controls in the discovery slice", async () => {
    seedMockRecipes(testRecipeDetails);

    render(<RecipesView />);

    expect(
      await screen.findByRole("article", {
        name: "Recipe card: Sheet Pan Salmon",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Add recipe" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Back to recipes" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(`Selected recipe: ${testRecipeDetail.id}`),
    ).not.toBeInTheDocument();
  });
});

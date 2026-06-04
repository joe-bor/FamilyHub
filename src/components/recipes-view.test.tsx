import { delay, HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  CreateRecipeRequest,
  ImportRecipeRequest,
} from "@/lib/types/recipes";
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
import { render, renderWithUser, screen, typeAndWait } from "@/test/test-utils";
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
    expect(screen.getByRole("button", { name: "Add recipe" })).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Import from URL" }),
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

  it("preserves ordered manual ingredients, instructions, and tags when saving", async () => {
    seedMockRecipes([]);

    const createRecipe = vi.fn(async ({ request }) => {
      const body = (await request.json()) as CreateRecipeRequest;

      expect(body).toMatchObject({
        title: "Layered Salad",
        ingredients: ["lettuce", "dressing", "seeds"],
        instructions: ["wash", "stack", "serve"],
        tags: ["make-ahead", "side", "summer"],
      });

      return HttpResponse.json({
        data: {
          id: "00000000-0000-4000-8000-000000000599",
          title: body.title,
          imageUrl: null,
          ingredients: body.ingredients ?? [],
          instructions: body.instructions ?? [],
          note: null,
          sourceUrl: null,
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
    expect(createRecipe).toHaveBeenCalledTimes(1);
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
});

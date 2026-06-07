import { describe, expect, it, vi } from "vitest";
import { testRecipeSummary } from "@/test/fixtures/recipes";
import { fireEvent, render, screen } from "@/test/test-utils";
import { RecipeMatchList } from "./recipe-match-list";

describe("RecipeMatchList", () => {
  it("returns null when recipes array is empty", () => {
    const { container } = render(
      <RecipeMatchList title="Matches" recipes={[]} onSelectRecipe={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders recipe rows with the recipe title", () => {
    render(
      <RecipeMatchList
        title="Matches"
        recipes={[testRecipeSummary]}
        onSelectRecipe={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", {
        name: `Select recipe: ${testRecipeSummary.title}`,
      }),
    ).toBeInTheDocument();
  });

  it("shows the image when imageUrl is present and load succeeds", () => {
    const { container } = render(
      <RecipeMatchList
        title="Matches"
        recipes={[testRecipeSummary]}
        onSelectRecipe={vi.fn()}
      />,
    );

    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img).toHaveAttribute("src", testRecipeSummary.imageUrl);
  });

  it("shows no image element when imageUrl is absent", () => {
    const recipe = { ...testRecipeSummary, imageUrl: null };
    const { container } = render(
      <RecipeMatchList
        title="Matches"
        recipes={[recipe]}
        onSelectRecipe={vi.fn()}
      />,
    );

    expect(container.querySelector("img")).toBeNull();
  });

  it("falls back to the placeholder div when the image fails to load", () => {
    const { container } = render(
      <RecipeMatchList
        title="Matches"
        recipes={[testRecipeSummary]}
        onSelectRecipe={vi.fn()}
      />,
    );

    const img = container.querySelector("img") as HTMLImageElement | null;
    expect(img).not.toBeNull();

    fireEvent.error(img as HTMLImageElement);

    // Image should be replaced by the fallback div — no img element in DOM
    expect(container.querySelector("img")).toBeNull();
  });

  it("calls onSelectRecipe when a recipe button is clicked", async () => {
    const onSelectRecipe = vi.fn();
    render(
      <RecipeMatchList
        title="Matches"
        recipes={[testRecipeSummary]}
        onSelectRecipe={onSelectRecipe}
      />,
    );

    screen
      .getByRole("button", {
        name: `Select recipe: ${testRecipeSummary.title}`,
      })
      .click();

    expect(onSelectRecipe).toHaveBeenCalledWith(testRecipeSummary);
  });
});

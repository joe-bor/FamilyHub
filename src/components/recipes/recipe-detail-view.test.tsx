import { describe, expect, it, vi } from "vitest";
import { testRecipeDetail } from "@/test/fixtures/recipes";
import { render, screen } from "@/test/test-utils";
import { RecipeDetailView } from "./recipe-detail-view";

describe("RecipeDetailView", () => {
  it("renders recipe content and Back button when no action handlers are provided", () => {
    render(<RecipeDetailView recipe={testRecipeDetail} onBack={vi.fn()} />);

    // Content always present
    expect(
      screen.getByRole("heading", { name: testRecipeDetail.title }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Ingredients" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Instructions" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Back to recipes" }),
    ).toBeInTheDocument();

    // Action buttons absent when handlers not provided
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

  it("renders all action buttons when all handlers are provided", () => {
    render(
      <RecipeDetailView
        recipe={testRecipeDetail}
        onBack={vi.fn()}
        onEdit={vi.fn()}
        onAddToMeals={vi.fn()}
        onToggleFavorite={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Back to recipes" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Edit recipe" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Add to Meals" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: `Favorite recipe: ${testRecipeDetail.title}`,
      }),
    ).toBeInTheDocument();
  });

  it("renders only the Edit button when only onEdit is provided", () => {
    render(
      <RecipeDetailView
        recipe={testRecipeDetail}
        onBack={vi.fn()}
        onEdit={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Edit recipe" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Add to Meals" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: `Favorite recipe: ${testRecipeDetail.title}`,
      }),
    ).not.toBeInTheDocument();
  });

  it("renders only the Favorite button when only onToggleFavorite is provided", () => {
    render(
      <RecipeDetailView
        recipe={testRecipeDetail}
        onBack={vi.fn()}
        onToggleFavorite={vi.fn()}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Edit recipe" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Add to Meals" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: `Favorite recipe: ${testRecipeDetail.title}`,
      }),
    ).toBeInTheDocument();
  });
});

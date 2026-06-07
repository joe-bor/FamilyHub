import { describe, expect, it, vi } from "vitest";
import { testRecipeSummary } from "@/test/fixtures/recipes";
import { fireEvent, render, screen } from "@/test/test-utils";
import { RecipeLibraryCard } from "./recipe-library-card";

describe("RecipeLibraryCard", () => {
  it("shows the recipe image when imageUrl is present and load succeeds", () => {
    render(<RecipeLibraryCard recipe={testRecipeSummary} />);

    const img = screen.getByRole("img", { name: testRecipeSummary.title });
    expect(img).toBeInTheDocument();
    expect(screen.queryByText("No photo")).not.toBeInTheDocument();
  });

  it("shows the No photo placeholder when imageUrl is absent", () => {
    const recipe = { ...testRecipeSummary, imageUrl: null };
    render(<RecipeLibraryCard recipe={recipe} />);

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("No photo")).toBeInTheDocument();
  });

  it("falls back to No photo placeholder when the image fails to load", () => {
    render(<RecipeLibraryCard recipe={testRecipeSummary} />);

    const img = screen.getByRole("img", { name: testRecipeSummary.title });
    expect(img).toBeInTheDocument();

    fireEvent.error(img);

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("No photo")).toBeInTheDocument();
  });

  it("calls onSelect with the recipe id when the open button is clicked", async () => {
    const onSelect = vi.fn();
    render(
      <RecipeLibraryCard recipe={testRecipeSummary} onSelect={onSelect} />,
    );

    const btn = screen.getByRole("button", {
      name: `Open recipe: ${testRecipeSummary.title}`,
    });
    btn.click();

    expect(onSelect).toHaveBeenCalledWith(testRecipeSummary.id);
  });
});

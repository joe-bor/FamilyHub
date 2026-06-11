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

  it("uses a compact mobile row with the desktop vertical card restored at md", () => {
    render(<RecipeLibraryCard recipe={testRecipeSummary} />);

    const card = screen.getByRole("article", {
      name: `Recipe card: ${testRecipeSummary.title}`,
    });
    const thumbnail = screen.getByRole("img", {
      name: testRecipeSummary.title,
    }).parentElement;

    expect(card).toHaveClass("flex-row", "p-3", "md:flex-col", "md:p-0");
    expect(thumbnail).toHaveClass(
      "size-24",
      "shrink-0",
      "rounded-lg",
      "md:aspect-[4/3]",
      "md:w-full",
      "md:rounded-none",
    );
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

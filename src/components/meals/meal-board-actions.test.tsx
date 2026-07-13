import { describe, expect, it, vi } from "vitest";
import { renderWithUser, screen } from "@/test/test-utils";
import { MealBoardActions } from "./meal-board-actions";

describe("MealBoardActions", () => {
  it("renders both buttons when canAddIngredients is true", () => {
    renderWithUser(
      <MealBoardActions
        canAddIngredients
        onAddIngredients={vi.fn()}
        onFillEmptySlots={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Add ingredients" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Fill empty slots" }),
    ).toBeInTheDocument();
  });

  it("hides Add ingredients when canAddIngredients is false", () => {
    renderWithUser(
      <MealBoardActions
        canAddIngredients={false}
        onAddIngredients={vi.fn()}
        onFillEmptySlots={vi.fn()}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Add ingredients" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Fill empty slots" }),
    ).toBeInTheDocument();
  });

  it("invokes callbacks when the buttons are clicked", async () => {
    const onAddIngredients = vi.fn();
    const onFillEmptySlots = vi.fn();
    const { user } = renderWithUser(
      <MealBoardActions
        canAddIngredients
        onAddIngredients={onAddIngredients}
        onFillEmptySlots={onFillEmptySlots}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Add ingredients" }));
    await user.click(screen.getByRole("button", { name: "Fill empty slots" }));

    expect(onAddIngredients).toHaveBeenCalledOnce();
    expect(onFillEmptySlots).toHaveBeenCalledOnce();
  });
});

import { describe, expect, it, vi } from "vitest";
import {
  renderWithUser,
  screen,
  typeAndWait,
  waitFor,
} from "@/test/test-utils";
import { RecipeForm } from "./recipe-form";

describe("RecipeForm — per-row remove controls", () => {
  it("renders a Remove button for each ingredient row", async () => {
    renderWithUser(<RecipeForm onSubmit={vi.fn()} />);

    // Default is 2 rows, so expect 2 remove buttons
    expect(
      screen.getByRole("button", { name: "Remove ingredient 1" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Remove ingredient 2" }),
    ).toBeInTheDocument();
  });

  it("renders a Remove button for each instruction row", async () => {
    renderWithUser(<RecipeForm onSubmit={vi.fn()} />);

    expect(
      screen.getByRole("button", { name: "Remove instruction 1" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Remove instruction 2" }),
    ).toBeInTheDocument();
  });

  it("renders a Remove button for each tag row", async () => {
    renderWithUser(<RecipeForm onSubmit={vi.fn()} />);

    expect(
      screen.getByRole("button", { name: "Remove tag 1" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Remove tag 2" }),
    ).toBeInTheDocument();
  });

  it("removes the middle ingredient row and shifts remaining values correctly", async () => {
    const { user } = renderWithUser(<RecipeForm onSubmit={vi.fn()} />);

    // Fill the default 2 rows
    await typeAndWait(user, screen.getByLabelText("Ingredient 1"), "apple");
    await typeAndWait(user, screen.getByLabelText("Ingredient 2"), "banana");

    // Add a third row
    await user.click(screen.getByRole("button", { name: "Add ingredient" }));
    await waitFor(() => {
      expect(screen.getByLabelText("Ingredient 3")).toBeInTheDocument();
    });
    await typeAndWait(user, screen.getByLabelText("Ingredient 3"), "cherry");

    // Remove the middle row (Ingredient 2 = "banana")
    await user.click(
      screen.getByRole("button", { name: "Remove ingredient 2" }),
    );

    // After removal: "apple" stays in row 1, "cherry" moves to row 2
    await waitFor(() => {
      expect(screen.getByLabelText("Ingredient 1")).toHaveValue("apple");
      expect(screen.getByLabelText("Ingredient 2")).toHaveValue("cherry");
    });

    // "banana" should be gone
    const allInputs = screen
      .getAllByRole("textbox")
      .filter((input) =>
        input.getAttribute("aria-label")?.startsWith("Ingredient"),
      );
    expect(allInputs).toHaveLength(2);
    expect(
      allInputs.every(
        (input) => (input as HTMLInputElement).value !== "banana",
      ),
    ).toBe(true);
  });

  it("removes the middle instruction row and shifts remaining values correctly", async () => {
    const { user } = renderWithUser(<RecipeForm onSubmit={vi.fn()} />);

    await typeAndWait(user, screen.getByLabelText("Instruction 1"), "step one");
    await typeAndWait(user, screen.getByLabelText("Instruction 2"), "step two");

    await user.click(screen.getByRole("button", { name: "Add instruction" }));
    await waitFor(() => {
      expect(screen.getByLabelText("Instruction 3")).toBeInTheDocument();
    });
    await typeAndWait(
      user,
      screen.getByLabelText("Instruction 3"),
      "step three",
    );

    await user.click(
      screen.getByRole("button", { name: "Remove instruction 2" }),
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Instruction 1")).toHaveValue("step one");
      expect(screen.getByLabelText("Instruction 2")).toHaveValue("step three");
    });

    const allInputs = screen
      .getAllByRole("textbox")
      .filter((input) =>
        input.getAttribute("aria-label")?.startsWith("Instruction"),
      );
    expect(allInputs).toHaveLength(2);
    expect(
      allInputs.every(
        (input) => (input as HTMLInputElement).value !== "step two",
      ),
    ).toBe(true);
  });

  it("removes the middle tag row and shifts remaining values correctly", async () => {
    const { user } = renderWithUser(<RecipeForm onSubmit={vi.fn()} />);

    await typeAndWait(user, screen.getByLabelText("Tag 1"), "vegan");
    await typeAndWait(user, screen.getByLabelText("Tag 2"), "quick");

    await user.click(screen.getByRole("button", { name: "Add tag" }));
    await waitFor(() => {
      expect(screen.getByLabelText("Tag 3")).toBeInTheDocument();
    });
    await typeAndWait(user, screen.getByLabelText("Tag 3"), "dinner");

    await user.click(screen.getByRole("button", { name: "Remove tag 2" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Tag 1")).toHaveValue("vegan");
      expect(screen.getByLabelText("Tag 2")).toHaveValue("dinner");
    });

    const allInputs = screen
      .getAllByRole("textbox")
      .filter((input) => input.getAttribute("aria-label")?.startsWith("Tag"));
    expect(allInputs).toHaveLength(2);
    expect(
      allInputs.every((input) => (input as HTMLInputElement).value !== "quick"),
    ).toBe(true);
  });

  it("keeps at least two blank rows after removing all ingredients, and can submit a name-only recipe", async () => {
    const onSubmit = vi.fn();
    const { user } = renderWithUser(<RecipeForm onSubmit={onSubmit} />);

    // Default state: 2 blank rows. Remove row 1 → re-pads back to 2 blank rows.
    await user.click(
      screen.getByRole("button", { name: "Remove ingredient 1" }),
    );

    // Still 2 blank ingredient rows
    await waitFor(() => {
      const ingredientInputs = screen
        .getAllByRole("textbox")
        .filter((input) =>
          input.getAttribute("aria-label")?.startsWith("Ingredient"),
        );
      expect(ingredientInputs).toHaveLength(2);
      expect(ingredientInputs[0]).toHaveValue("");
      expect(ingredientInputs[1]).toHaveValue("");
    });

    // Remove the second of the re-padded rows → still 2 blank rows
    await user.click(
      screen.getByRole("button", { name: "Remove ingredient 2" }),
    );

    await waitFor(() => {
      const ingredientInputs = screen
        .getAllByRole("textbox")
        .filter((input) =>
          input.getAttribute("aria-label")?.startsWith("Ingredient"),
        );
      expect(ingredientInputs).toHaveLength(2);
      ingredientInputs.forEach((input) => {
        expect(input).toHaveValue("");
      });
    });

    // Fill in a title and submit — onSubmit should receive empty arrays (blank strings stripped)
    await typeAndWait(user, screen.getByLabelText("Title"), "Simple Recipe");
    await user.click(screen.getByRole("button", { name: "Save recipe" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    const submitted = onSubmit.mock.calls[0][0];
    expect(submitted.ingredients).toEqual([]);
    expect(submitted.instructions).toEqual([]);
    expect(submitted.tags).toEqual([]);
    expect(submitted.title).toBe("Simple Recipe");
  });
});

import { type ComponentProps, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import type { RecipeSummary } from "@/lib/types";
import { createEmptyMealsBoard } from "@/test/fixtures/meals";
import {
  importedRecipeDetail,
  testRecipeDetail,
} from "@/test/fixtures/recipes";
import { renderWithUser, screen, within } from "@/test/test-utils";
import { MealPlanningPanel } from "./meal-planning-panel";
import {
  buildPlanningQueue,
  type MealPlanningDraft,
  type MealPlanningTarget,
} from "./meal-planning-session";

const board = createEmptyMealsBoard();
const queue = buildPlanningQueue(board, { kind: "empty_dinners" });
const recipes: RecipeSummary[] = [
  {
    id: testRecipeDetail.id,
    title: testRecipeDetail.title,
    imageUrl: testRecipeDetail.imageUrl,
    favorite: true,
    tags: testRecipeDetail.tags,
    updatedAt: testRecipeDetail.updatedAt,
  },
  {
    id: importedRecipeDetail.id,
    title: importedRecipeDetail.title,
    imageUrl: importedRecipeDetail.imageUrl,
    favorite: false,
    tags: importedRecipeDetail.tags,
    updatedAt: importedRecipeDetail.updatedAt,
  },
];

function draftFor(
  target: MealPlanningTarget,
  title = "Tacos",
): MealPlanningDraft {
  return {
    target,
    displayTitle: title,
    displayImageUrl: null,
    displayNote: null,
    primary: {
      sourceType: "quick",
      recipeId: null,
      title,
      imageUrl: null,
      note: null,
    },
    note: null,
  };
}

function renderPanel(
  overrides: Partial<ComponentProps<typeof MealPlanningPanel>> = {},
) {
  const props = {
    isOpen: true,
    board,
    queue,
    drafts: [],
    currentIndex: 0,
    recipes,
    isSaving: false,
    saveError: null,
    conflictedTargets: [],
    onAddDraft: vi.fn(),
    onRemoveDraft: vi.fn(),
    onSkip: vi.fn(),
    onBack: vi.fn(),
    onReview: vi.fn(),
    onSave: vi.fn(),
    onSaveNonConflicted: vi.fn(),
    onKeepEditing: vi.fn(),
    onCancelSave: vi.fn(),
    onCancel: vi.fn(),
    onChangeDraft: vi.fn(),
    ...overrides,
  };

  return {
    props,
    ...renderWithUser(<MealPlanningPanel {...props} />),
  };
}

describe("MealPlanningPanel", () => {
  it("creates quick and recipe drafts without saving the slot", async () => {
    const { props, user } = renderPanel();

    expect(
      screen.getByRole("dialog", { name: "Meal planning" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Sunday dinner - 1 of 7")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Meal name"), "  Tacos  ");
    await user.click(
      screen.getByRole("button", { name: "Add quick meal draft" }),
    );

    expect(props.onAddDraft).toHaveBeenLastCalledWith({
      target: { dayIndex: 0, mealType: "dinner" },
      displayTitle: "Tacos",
      displayImageUrl: null,
      displayNote: null,
      primary: {
        sourceType: "quick",
        recipeId: null,
        title: "Tacos",
        imageUrl: null,
        note: null,
      },
      note: null,
    });

    await user.clear(screen.getByLabelText("Meal name"));
    await user.click(
      screen.getByRole("button", {
        name: `Select recipe: ${testRecipeDetail.title}`,
      }),
    );

    expect(props.onAddDraft).toHaveBeenLastCalledWith({
      target: { dayIndex: 0, mealType: "dinner" },
      displayTitle: testRecipeDetail.title,
      displayImageUrl: testRecipeDetail.imageUrl,
      displayNote: null,
      primary: {
        sourceType: "recipe",
        recipeId: testRecipeDetail.id,
        title: null,
        imageUrl: null,
        note: null,
      },
      note: null,
    });
  });

  it("keeps the recipe tray visible across draft choices", async () => {
    function Harness() {
      const [drafts, setDrafts] = useState<MealPlanningDraft[]>([]);
      const [currentIndex, setCurrentIndex] = useState(0);

      return (
        <MealPlanningPanel
          isOpen
          board={board}
          queue={queue}
          drafts={drafts}
          currentIndex={currentIndex}
          recipes={recipes}
          isSaving={false}
          saveError={null}
          conflictedTargets={[]}
          onAddDraft={(draft) => {
            setDrafts((current) => [...current, draft]);
            setCurrentIndex((index) => index + 1);
          }}
          onRemoveDraft={vi.fn()}
          onSkip={vi.fn()}
          onBack={vi.fn()}
          onReview={vi.fn()}
          onSave={vi.fn()}
          onSaveNonConflicted={vi.fn()}
          onKeepEditing={vi.fn()}
          onCancelSave={vi.fn()}
          onCancel={vi.fn()}
        />
      );
    }

    const { user } = renderWithUser(<Harness />);

    await user.type(screen.getByLabelText("Meal name"), "Tacos");
    await user.click(
      screen.getByRole("button", { name: "Add quick meal draft" }),
    );

    expect(screen.getByText("Monday dinner - 2 of 7")).toBeInTheDocument();
    expect(screen.getByText("Favorite recipes")).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: `Select recipe: ${testRecipeDetail.title}`,
      }),
    ).toBeInTheDocument();
  });

  it("calls skip, remove, and change-draft callbacks with the active target", async () => {
    const draft = draftFor({ dayIndex: 0, mealType: "dinner" });
    const { props, user } = renderPanel({
      drafts: [draft],
      currentIndex: queue.length,
    });

    await user.click(screen.getByRole("button", { name: "Change draft" }));
    expect(props.onChangeDraft).toHaveBeenCalledWith(draft.target);

    await user.click(
      screen.getByRole("button", { name: "Remove draft: Tacos" }),
    );
    expect(props.onRemoveDraft).toHaveBeenCalledWith(draft.target);

    await user.click(screen.getByRole("button", { name: "Keep editing" }));
    expect(props.onKeepEditing).toHaveBeenCalledTimes(1);
  });

  it("mirrors current target and draft controls inside the planning surface", async () => {
    const draft = draftFor({ dayIndex: 0, mealType: "dinner" });
    const { props, user } = renderPanel({
      drafts: [draft],
      currentIndex: 1,
    });

    const surface = screen.getByRole("region", {
      name: "Planning board status",
    });
    const draftButton = within(surface).getByRole("button", {
      name: "Draft dinner: Tacos",
    });
    expect(draftButton).toBeInTheDocument();
    await user.click(draftButton);
    expect(props.onChangeDraft).toHaveBeenCalledWith(draft.target);

    const currentTarget = within(surface).getByRole("button", {
      name: "Current dinner target: Monday dinner",
    });
    expect(currentTarget).toHaveAttribute("aria-current", "true");
  });

  it("disables editing controls and sheet cancellation while a save is pending", async () => {
    const draft = draftFor(
      { dayIndex: 1, mealType: "dinner" },
      testRecipeDetail.title,
    );
    const { props, user } = renderPanel({
      drafts: [draft],
      currentIndex: 1,
      isSaving: true,
    });

    expect(screen.getByRole("button", { name: "Update draft" })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Skip this slot" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", {
        name: `Remove draft: ${testRecipeDetail.title}`,
      }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Review plan" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Back" })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Cancel planning" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", {
        name: `Select recipe: ${testRecipeDetail.title}`,
      }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Show all recipes" }),
    ).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(props.onCancel).not.toHaveBeenCalled();
  });

  it("disables review and conflict controls while a save is pending", () => {
    const draft = draftFor({ dayIndex: 0, mealType: "dinner" });
    renderPanel({
      drafts: [draft],
      currentIndex: queue.length,
      isSaving: true,
      conflictedTargets: [draft.target],
    });

    expect(screen.getByRole("button", { name: "Saving..." })).toBeDisabled();
    expect(
      screen.getByRole("button", {
        name: "Skip conflicted and save remaining",
      }),
    ).toBeDisabled();
    for (const button of screen.getAllByRole("button", {
      name: "Keep editing",
    })) {
      expect(button).toBeDisabled();
    }
    expect(screen.getByRole("button", { name: "Cancel save" })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Cancel planning" }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Change draft" })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Remove draft: Tacos" }),
    ).toBeDisabled();
  });

  it("renders review, save, and conflict actions", async () => {
    const draft = draftFor({ dayIndex: 0, mealType: "dinner" });
    const { props, user } = renderPanel({
      drafts: [draft],
      currentIndex: queue.length,
      conflictedTargets: [draft.target],
      saveError: new Error("Some meal slots are no longer empty."),
    });

    expect(screen.getByText("1 meals ready to add")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Some meal slots are no longer empty.",
    );

    await user.click(screen.getByRole("button", { name: "Save to week" }));
    expect(props.onSave).toHaveBeenCalledTimes(1);

    await user.click(
      screen.getByRole("button", {
        name: "Skip conflicted and save remaining",
      }),
    );
    expect(props.onSaveNonConflicted).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByRole("button", { name: "Replace primary" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Add as extra" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancel save" }));
    expect(props.onCancelSave).toHaveBeenCalledTimes(1);

    const summary = screen.getByRole("list", { name: "Draft meals" });
    expect(within(summary).getByText("Tacos")).toBeInTheDocument();
  });
});

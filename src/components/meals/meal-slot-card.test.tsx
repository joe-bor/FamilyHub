import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import type { MealSlot, MealSlotEntry } from "@/lib/types";
import { render, screen } from "@/test/test-utils";
import type { MealPlanningDraft } from "./meal-planning-session";
import { MealSlotCard } from "./meal-slot-card";

function entry(title: string, role: MealSlotEntry["role"]): MealSlotEntry {
  return {
    id: `${role}-1`,
    role,
    sourceType: "quick",
    recipeId: null,
    title,
    imageUrl: null,
    note: null,
  };
}

function slot(
  overrides: Partial<Pick<MealSlot, "primary" | "extras">> = {},
): MealSlot {
  return {
    id: null,
    weekStartDate: "2026-07-12",
    dayIndex: 5,
    mealType: "dinner",
    primary: null,
    extras: [],
    note: null,
    ...overrides,
  };
}

function draft(title: string): MealPlanningDraft {
  return {
    target: { dayIndex: 5, mealType: "dinner" },
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

function renderCard(
  overrides: Partial<ComponentProps<typeof MealSlotCard>> = {},
) {
  render(
    <MealSlotCard
      slot={slot()}
      readOnly={false}
      dayLabel="Friday"
      onSelectSlot={vi.fn()}
      {...overrides}
    />,
  );
}

describe("MealSlotCard accessible label", () => {
  it("treats an empty pending recipe ID as no pending recipe", () => {
    renderCard({ pendingRecipeId: "" });

    expect(
      screen.getByRole("button", { name: "Add dinner meal, Friday" }),
    ).toBeInTheDocument();
  });

  it("gives a draft precedence over primary and extra entries", () => {
    renderCard({
      slot: slot({
        primary: entry("Stored primary", "primary"),
        extras: [entry("Stored extra", "extra")],
      }),
      draft: draft("Draft meal"),
    });

    expect(
      screen.getByRole("button", {
        name: "Draft dinner, Friday: Draft meal",
      }),
    ).toBeInTheDocument();
  });

  it("gives a primary entry precedence over extra entries", () => {
    renderCard({
      slot: slot({
        primary: entry("Stored primary", "primary"),
        extras: [entry("Stored extra", "extra")],
      }),
    });

    expect(
      screen.getByRole("button", {
        name: "Open dinner, Friday: Stored primary",
      }),
    ).toBeInTheDocument();
  });

  it("uses the first extra title when no draft or primary exists", () => {
    renderCard({
      slot: slot({ extras: [entry("Stored extra", "extra")] }),
    });

    expect(
      screen.getByRole("button", {
        name: "Open dinner, Friday: extras - Stored extra",
      }),
    ).toBeInTheDocument();
  });

  it("omits a falsy first extra title", () => {
    renderCard({ slot: slot({ extras: [entry("", "extra")] }) });

    expect(
      screen.getByRole("button", { name: "Open dinner, Friday: extras" }),
    ).toBeInTheDocument();
  });
});

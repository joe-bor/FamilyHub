import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { MealSlot, MealSlotEntry } from "@/lib/types";
import { MealGridCard } from "./meal-grid-card";

function buildEntry(overrides: Partial<MealSlotEntry> = {}): MealSlotEntry {
  return {
    id: "entry-1",
    role: "primary",
    sourceType: "quick",
    recipeId: null,
    title: "Meal",
    imageUrl: null,
    note: null,
    ...overrides,
  };
}

function buildSlot(overrides: Partial<MealSlot> = {}): MealSlot {
  return {
    id: null,
    weekStartDate: "2026-07-05",
    dayIndex: 3,
    mealType: "dinner",
    primary: null,
    extras: [],
    note: null,
    ...overrides,
  };
}

describe("MealGridCard", () => {
  it("renders a photo banner and title for a recipe-backed meal", () => {
    const slot = buildSlot({
      primary: buildEntry({
        id: "p1",
        sourceType: "recipe",
        recipeId: "r1",
        title: "Chicken Adobo",
        imageUrl: "https://example.com/adobo.jpg",
        note: "rice night",
      }),
    });
    render(
      <MealGridCard
        slot={slot}
        readOnly={false}
        dayLabel="Wednesday"
        onSelectSlot={vi.fn()}
      />,
    );

    const card = screen.getByRole("button", {
      name: "Open dinner, Wednesday: Chicken Adobo",
    });
    expect(card).toBeVisible();
    const image = card.querySelector("img");
    expect(image).toHaveAttribute("src", "https://example.com/adobo.jpg");
    expect(image).toHaveAttribute("alt", "");
    expect(screen.getByText("Chicken Adobo")).toBeVisible();
    expect(screen.getByText("Chicken Adobo")).toHaveClass("line-clamp-2");
    expect(screen.getByText("rice night")).toBeVisible();
    // Grid cards carry no meal-type eyebrow; the rail labels the row.
    expect(screen.queryByText("Dinner")).not.toBeInTheDocument();
  });

  it("renders a tinted placeholder band for image-less meals", () => {
    const slot = buildSlot({
      primary: buildEntry({
        id: "p1",
        title: "Leftovers",
      }),
    });
    render(
      <MealGridCard
        slot={slot}
        readOnly={false}
        dayLabel="Wednesday"
        onSelectSlot={vi.fn()}
      />,
    );

    const card = screen.getByRole("button", {
      name: "Open dinner, Wednesday: Leftovers",
    });
    const band = card.querySelector('[data-slot="meal-band"]');
    expect(band).not.toBeNull();
    expect(band).toHaveClass("bg-meal-dinner");
    expect(band?.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    expect(card.querySelector("img")).toBeNull();
    // Filled card, not an add target: solid border, no dashed styling.
    expect(card.className).not.toContain("border-dashed");
  });

  it("shows extras chips with overflow count", () => {
    const slot = buildSlot({
      primary: buildEntry({
        id: "p1",
        title: "Pasta",
      }),
      extras: [
        buildEntry({ id: "e1", role: "extra", title: "Garlic bread" }),
        buildEntry({ id: "e2", role: "extra", title: "Salad" }),
        buildEntry({ id: "e3", role: "extra", title: "Juice" }),
      ],
    });
    render(
      <MealGridCard
        slot={slot}
        readOnly={false}
        dayLabel="Monday"
        onSelectSlot={vi.fn()}
      />,
    );

    expect(screen.getByText("Garlic bread")).toBeVisible();
    expect(screen.getByText("Salad")).toBeVisible();
    expect(screen.getByText("+1 more")).toBeVisible();
    expect(screen.queryByText("Juice")).not.toBeInTheDocument();
  });

  it("renders a draft badge and hides extras while drafting", () => {
    const slot = buildSlot({
      extras: [buildEntry({ id: "e1", role: "extra", title: "Rice" })],
    });
    render(
      <MealGridCard
        slot={slot}
        readOnly={false}
        dayLabel="Friday"
        draft={{
          target: { dayIndex: 3, mealType: "dinner" },
          displayTitle: "Sinigang",
          displayImageUrl: null,
          displayNote: null,
          primary: {
            sourceType: "quick",
            recipeId: null,
            title: "Sinigang",
            imageUrl: null,
            note: null,
          },
          note: null,
        }}
        onSelectSlot={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Draft dinner, Friday: Sinigang" }),
    ).toBeVisible();
    expect(screen.getByText("Draft")).toBeVisible();
    expect(screen.getByText("Draft")).toHaveClass("shrink-0");
    expect(screen.queryByText("Rice")).not.toBeInTheDocument();
  });

  it("renders a full-cell add target for empty editable slots", async () => {
    const user = userEvent.setup();
    const onSelectSlot = vi.fn();
    const slot = buildSlot();
    render(
      <MealGridCard
        slot={slot}
        readOnly={false}
        dayLabel="Wednesday"
        onSelectSlot={onSelectSlot}
      />,
    );

    const target = screen.getByRole("button", {
      name: "Add dinner meal, Wednesday",
    });
    expect(target).toBeVisible();
    expect(target.className).toContain("border-dashed");
    expect(screen.getByText("Add dinner")).toBeVisible();

    await user.click(target);
    expect(onSelectSlot).toHaveBeenCalledWith(slot);
  });

  it("labels recipe placement on empty slots", () => {
    const slot = buildSlot();
    render(
      <MealGridCard
        slot={slot}
        readOnly={false}
        dayLabel="Wednesday"
        pendingRecipeId="r9"
        onSelectSlot={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Add recipe to dinner, Wednesday" }),
    ).toBeVisible();
  });

  it("treats an empty pending recipe ID as no pending recipe", () => {
    const slot = buildSlot();
    render(
      <MealGridCard
        slot={slot}
        readOnly={false}
        dayLabel="Wednesday"
        pendingRecipeId=""
        onSelectSlot={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Add dinner meal, Wednesday" }),
    ).toBeVisible();
  });

  it("renders a quiet non-interactive cell for empty read-only slots", () => {
    const slot = buildSlot();
    render(
      <MealGridCard
        slot={slot}
        readOnly
        dayLabel="Wednesday"
        onSelectSlot={vi.fn()}
      />,
    );

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText("Dinner")).toBeVisible();
  });

  it("marks the active planning target", () => {
    const slot = buildSlot();
    render(
      <MealGridCard
        slot={slot}
        readOnly={false}
        dayLabel="Wednesday"
        isPlanningTarget
        onSelectSlot={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Add dinner meal, Wednesday" }),
    ).toHaveAttribute("aria-current", "true");
  });

  it("recovers from an image error when the meal image URL changes", () => {
    const imageA = "https://example.com/a.jpg";
    const imageB = "https://example.com/b.jpg";
    const { rerender } = render(
      <MealGridCard
        slot={buildSlot({
          primary: buildEntry({ title: "Adobo", imageUrl: imageA }),
        })}
        readOnly={false}
        dayLabel="Wednesday"
        onSelectSlot={vi.fn()}
      />,
    );

    const firstImage = screen
      .getByRole("button", { name: "Open dinner, Wednesday: Adobo" })
      .querySelector("img");
    expect(firstImage).toHaveAttribute("src", imageA);
    expect(firstImage).toHaveAttribute("alt", "");
    fireEvent.error(firstImage as HTMLImageElement);

    const fallback = screen
      .getByRole("button", { name: "Open dinner, Wednesday: Adobo" })
      .querySelector('[data-slot="meal-band"]');
    expect(fallback).not.toBeNull();
    expect(fallback?.querySelector("svg")).toHaveAttribute(
      "aria-hidden",
      "true",
    );

    rerender(
      <MealGridCard
        slot={buildSlot({
          primary: buildEntry({ title: "Adobo", imageUrl: imageB }),
        })}
        readOnly={false}
        dayLabel="Wednesday"
        onSelectSlot={vi.fn()}
      />,
    );

    const recoveredImage = screen
      .getByRole("button", { name: "Open dinner, Wednesday: Adobo" })
      .querySelector("img");
    expect(recoveredImage).toHaveAttribute("src", imageB);
    expect(recoveredImage).toHaveAttribute("alt", "");
  });

  it("protects long content within a 154px card in the 170px row floor", () => {
    const primaryTitle =
      "A very long family dinner title that needs exactly two visible lines";
    const primaryNote =
      "A long primary note that may yield space before fixed content clips";
    const slotNote =
      "A long slot note that stays in the bounded notes region at minimum height";
    const slot = buildSlot({
      primary: buildEntry({ title: primaryTitle, note: primaryNote }),
      note: slotNote,
      extras: [
        buildEntry({
          id: "e1",
          role: "extra",
          title: "Extra-long garlic bread accompaniment",
        }),
        buildEntry({
          id: "e2",
          role: "extra",
          title: "Extra-long seasonal salad accompaniment",
        }),
        buildEntry({ id: "e3", role: "extra", title: "Juice" }),
      ],
    });
    render(
      <MealGridCard
        slot={slot}
        readOnly={false}
        dayLabel="Wednesday"
        onSelectSlot={vi.fn()}
      />,
    );

    const card = screen.getByRole("button", {
      name: `Open dinner, Wednesday: ${primaryTitle}`,
    });
    const body = card.querySelector('[data-slot="meal-body"]');
    // 154px card - 2px border = 152px content; 42% banner leaves 88.16px.
    // Body p-2 leaves 72.16px.
    // Two title lines (35px) + tray with pt-1 (24px) + two gaps (4px) = 63px,
    // leaving 9.16px for the notes region to yield into.
    expect.soft(body).toHaveClass("gap-0.5", "p-2");

    const title = screen.getByText(primaryTitle);
    expect(title).toBeVisible();
    expect.soft(title).toHaveClass("line-clamp-2", "shrink-0", "leading-tight");

    const notes = card.querySelector('[data-slot="meal-notes"]');
    expect.soft(notes).toHaveClass("min-h-0", "overflow-hidden");
    expect(screen.getByText(primaryNote)).toBeVisible();
    expect(screen.getByText(slotNote)).toBeVisible();

    const extras = card.querySelector('[data-slot="meal-extras"]');
    expect
      .soft(extras)
      .toHaveClass("shrink-0", "flex-nowrap", "overflow-hidden");
    expect
      .soft(screen.getByText("Extra-long garlic bread accompaniment"))
      .toHaveClass("truncate", "py-0.5");
    expect
      .soft(screen.getByText("Extra-long seasonal salad accompaniment"))
      .toHaveClass("truncate", "py-0.5");
    expect(screen.getByText("+1 more")).toBeVisible();
    expect.soft(screen.getByText("+1 more")).toHaveClass("py-0.5");
  });

  it("renders extras-only meals with the exact shared label", () => {
    render(
      <MealGridCard
        slot={buildSlot({
          extras: [
            buildEntry({ id: "e1", role: "extra", title: "Mango salad" }),
          ],
        })}
        readOnly={false}
        dayLabel="Sunday"
        onSelectSlot={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", {
        name: "Open dinner, Sunday: extras - Mango salad",
      }),
    ).toBeVisible();
    expect(screen.getByText("Extras")).toBeVisible();
    expect(screen.getByText("Mango salad")).toBeVisible();
  });

  it("renders the slot note", () => {
    render(
      <MealGridCard
        slot={buildSlot({
          primary: buildEntry({ title: "Tacos" }),
          note: "Use the blue serving bowls",
        })}
        readOnly={false}
        dayLabel="Tuesday"
        onSelectSlot={vi.fn()}
      />,
    );

    expect(screen.getByText("Use the blue serving bowls")).toBeVisible();
  });

  it("selects a filled slot", async () => {
    const user = userEvent.setup();
    const onSelectSlot = vi.fn();
    const slot = buildSlot({ primary: buildEntry({ title: "Tacos" }) });
    render(
      <MealGridCard
        slot={slot}
        readOnly={false}
        dayLabel="Tuesday"
        onSelectSlot={onSelectSlot}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Open dinner, Tuesday: Tacos" }),
    );
    expect(onSelectSlot).toHaveBeenCalledWith(slot);
  });

  it("selects a draft slot", async () => {
    const user = userEvent.setup();
    const onSelectSlot = vi.fn();
    const slot = buildSlot();
    render(
      <MealGridCard
        slot={slot}
        readOnly={false}
        dayLabel="Friday"
        draft={{
          target: { dayIndex: 3, mealType: "dinner" },
          displayTitle: "Sinigang",
          displayImageUrl: null,
          displayNote: null,
          primary: {
            sourceType: "quick",
            recipeId: null,
            title: "Sinigang",
            imageUrl: null,
            note: null,
          },
          note: null,
        }}
        onSelectSlot={onSelectSlot}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Draft dinner, Friday: Sinigang" }),
    );
    expect(onSelectSlot).toHaveBeenCalledWith(slot);
  });

  it("keeps filled read-only slots selectable", async () => {
    const user = userEvent.setup();
    const onSelectSlot = vi.fn();
    const slot = buildSlot({ primary: buildEntry({ title: "Tacos" }) });
    render(
      <MealGridCard
        slot={slot}
        readOnly
        dayLabel="Tuesday"
        onSelectSlot={onSelectSlot}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Open dinner, Tuesday: Tacos" }),
    );
    expect(onSelectSlot).toHaveBeenCalledWith(slot);
  });
});

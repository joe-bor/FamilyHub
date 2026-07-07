import { describe, expect, it, vi } from "vitest";
import { render, renderWithUser, screen } from "@/test/test-utils";
import type { HomeStateSummary } from "../lib/large-home-selectors";
import { LargeStateStrip } from "./large-state-strip";

const summaries: HomeStateSummary[] = [
  {
    module: "chores",
    kind: "remaining",
    label: "3 chores left",
    target: { module: "chores" },
  },
  {
    module: "meals",
    kind: "missing",
    label: "Dinner not planned",
    target: {
      module: "meals",
      weekStartDate: "2026-07-05",
      dayIndex: 0,
      mealType: "dinner",
    },
  },
  {
    module: "lists",
    kind: "active",
    label: "5 grocery items",
    target: { module: "lists", listId: "g1" },
  },
];

describe("LargeStateStrip", () => {
  it("renders the provided Chores, Meals, and Lists summaries", () => {
    render(<LargeStateStrip summaries={summaries} onSelect={vi.fn()} />);

    expect(
      screen.getByRole("button", { name: /open chores. 3 chores left/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /open meals. dinner not planned/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /open lists. 5 grocery items/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/recipes/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/photos/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/weather/i)).not.toBeInTheDocument();
  });

  it("selects the tapped summary target", async () => {
    const onSelect = vi.fn();
    const { user } = renderWithUser(
      <LargeStateStrip summaries={summaries} onSelect={onSelect} />,
    );

    await user.click(screen.getByRole("button", { name: /open meals/i }));
    expect(onSelect).toHaveBeenCalledWith(summaries[1].target);
  });
});

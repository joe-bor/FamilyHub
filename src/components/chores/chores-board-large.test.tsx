import { describe, expect, it, vi } from "vitest";
import type { ChoreScopeBoard } from "@/lib/types";
import { renderWithUser, screen } from "@/test/test-utils";
import { ChoresBoardLarge } from "./chores-board-large";

function scopeBoard(
  scope: ChoreScopeBoard["scope"],
  total: number,
): ChoreScopeBoard {
  return {
    scope,
    periodStartDate: "2026-06-11",
    periodEndDate: "2026-06-11",
    summary: { total, completed: 0, remaining: total },
    assignees:
      total === 0
        ? []
        : [
            {
              member: { id: "leo", name: "Leo", color: "coral" },
              summary: { total: 1, completed: 0, remaining: 1 },
              chores: [
                {
                  templateId: `${scope}-c1`,
                  title: `${scope} chore`,
                  cadence: "DAILY",
                  assignedToMemberId: "leo",
                  completed: false,
                  completedAt: null,
                },
              ],
            },
          ],
  };
}

describe("ChoresBoardLarge", () => {
  it("renders all three scope columns", () => {
    renderWithUser(
      <ChoresBoardLarge
        today={scopeBoard("TODAY", 0)}
        thisWeek={scopeBoard("THIS_WEEK", 0)}
        thisMonth={scopeBoard("THIS_MONTH", 0)}
      />,
    );

    expect(screen.getByRole("region", { name: "Today" })).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "This Week" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "This Month" }),
    ).toBeInTheDocument();
  });

  it("weights and emphasizes Today", () => {
    renderWithUser(
      <ChoresBoardLarge
        today={scopeBoard("TODAY", 0)}
        thisWeek={scopeBoard("THIS_WEEK", 0)}
        thisMonth={scopeBoard("THIS_MONTH", 0)}
      />,
    );

    const today = screen.getByRole("region", { name: "Today" });
    const thisWeek = screen.getByRole("region", { name: "This Week" });

    expect(today).toHaveAttribute("data-emphasis", "true");
    expect(today).toHaveClass("flex-[1.4]");
    expect(thisWeek).not.toHaveAttribute("data-emphasis");
    expect(thisWeek).toHaveClass("flex-1");
  });

  it("forwards completion with the scope and chore", async () => {
    const onComplete = vi.fn();
    const { user } = renderWithUser(
      <ChoresBoardLarge
        today={scopeBoard("TODAY", 1)}
        thisWeek={scopeBoard("THIS_WEEK", 0)}
        thisMonth={scopeBoard("THIS_MONTH", 0)}
        onComplete={onComplete}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: /mark TODAY chore complete/i }),
    );

    expect(onComplete).toHaveBeenCalledOnce();
    expect(onComplete.mock.calls[0]?.[0].scope).toBe("TODAY");
    expect(onComplete.mock.calls[0]?.[1].templateId).toBe("TODAY-c1");
  });
});

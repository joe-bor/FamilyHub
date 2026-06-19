import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { haptics } from "@/lib/haptics";
import type { ChoreBoardItem } from "@/lib/types";
import { ChoreRow } from "./chore-row";

// Cast: the row only reads templateId/title/cadence/completed.
const baseChore = {
  templateId: "t1",
  title: "Dishes",
  cadence: "DAILY",
  completed: false,
} as ChoreBoardItem;

describe("ChoreRow haptics", () => {
  it("fires success() on the complete path", async () => {
    const success = vi.spyOn(haptics, "success").mockImplementation(() => {});
    render(
      <ChoreRow
        chore={baseChore}
        onComplete={vi.fn()}
        onUncomplete={vi.fn()}
      />,
    );
    await userEvent.click(
      screen.getByRole("button", { name: /mark dishes complete/i }),
    );
    expect(success).toHaveBeenCalledTimes(1);
  });

  it("does NOT fire success() on the uncomplete path", async () => {
    const success = vi.spyOn(haptics, "success").mockImplementation(() => {});
    render(
      <ChoreRow
        chore={{ ...baseChore, completed: true }}
        onComplete={vi.fn()}
        onUncomplete={vi.fn()}
      />,
    );
    await userEvent.click(
      screen.getByRole("button", { name: /mark dishes incomplete/i }),
    );
    expect(success).not.toHaveBeenCalled();
  });
});

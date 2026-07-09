import { describe, expect, it } from "vitest";
import { useCalendarStore } from "@/stores";
import { renderWithUser, screen } from "@/test/test-utils";
import { DayRailToggle } from "./day-rail-toggle";

describe("DayRailToggle", () => {
  it("reflects and flips the persisted rail preference", async () => {
    useCalendarStore.setState({ dayRailHidden: false });
    const { user } = renderWithUser(<DayRailToggle />);

    const button = screen.getByRole("button", {
      name: /hide month navigator/i,
    });
    expect(button).toHaveAttribute("aria-pressed", "true");

    await user.click(button);

    expect(useCalendarStore.getState().dayRailHidden).toBe(true);
    expect(
      screen.getByRole("button", { name: /show month navigator/i }),
    ).toHaveAttribute("aria-pressed", "false");
  });
});

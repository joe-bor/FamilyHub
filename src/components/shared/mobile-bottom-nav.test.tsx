import { beforeEach, describe, expect, it } from "vitest";
import { useAppStore } from "@/stores";
import { render, renderWithUser, screen } from "@/test/test-utils";
import { MobileBottomNav } from "./mobile-bottom-nav";

describe("MobileBottomNav", () => {
  beforeEach(() => {
    useAppStore.setState({ activeModule: null });
  });

  it("shows four primary tabs plus More, and no Photos", () => {
    render(<MobileBottomNav />);
    const nav = screen.getByRole("navigation", { name: /primary/i });
    expect(nav).toBeInTheDocument();

    for (const label of ["Home", "Calendar", "Lists", "Chores", "More"]) {
      expect(
        screen.getByRole("button", { name: new RegExp(`^${label}$`, "i") }),
      ).toBeInTheDocument();
    }
    // Overflow + deferred modules are not in the bar.
    expect(
      screen.queryByRole("button", { name: /^meals$/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^photos$/i }),
    ).not.toBeInTheDocument();
  });

  it("opens the More sheet and switches to an overflow module", async () => {
    const { user } = renderWithUser(<MobileBottomNav />);
    await user.click(screen.getByRole("button", { name: /^more$/i }));

    const meals = await screen.findByRole("button", { name: /^meals$/i });
    await user.click(meals);

    expect(useAppStore.getState().activeModule).toBe("meals");
    // sheet closes
    expect(
      screen.queryByRole("button", { name: /^recipes$/i }),
    ).not.toBeInTheDocument();
  });

  it("marks the bottom nav inert while the More sheet is open", async () => {
    const { user } = renderWithUser(<MobileBottomNav />);
    const nav = screen.getByRole("navigation", { name: /primary/i });
    expect(nav).not.toHaveAttribute("inert");

    await user.click(screen.getByRole("button", { name: /^more$/i }));
    expect(nav).toHaveAttribute("inert");

    await user.click(screen.getByRole("button", { name: /^meals$/i }));
    expect(nav).not.toHaveAttribute("inert");
  });

  it("returns focus to the More trigger when the sheet closes", async () => {
    const { user } = renderWithUser(<MobileBottomNav />);
    const more = screen.getByRole("button", { name: /^more$/i });

    await user.click(more);
    expect(screen.getByRole("dialog", { name: /^more$/i })).toHaveFocus();

    await user.click(screen.getByRole("button", { name: /^meals$/i }));
    expect(more).toHaveFocus();
  });

  it("marks More active when an overflow module is active", () => {
    useAppStore.setState({ activeModule: "recipes" });
    render(<MobileBottomNav />);
    expect(screen.getByRole("button", { name: /^more$/i })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});

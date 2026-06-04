import { beforeEach, describe, expect, it } from "vitest";
import { useAppStore } from "@/stores";
import { render, renderWithUser, screen } from "@/test/test-utils";
import { MobileBottomNav } from "./mobile-bottom-nav";

describe("MobileBottomNav", () => {
  beforeEach(() => {
    useAppStore.setState({ activeModule: null, isSidebarOpen: false });
  });

  it("renders all seven destinations and marks Home active when activeModule is null", () => {
    render(<MobileBottomNav />);

    const nav = screen.getByRole("navigation", { name: /primary/i });

    expect(nav).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^home$/i })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      screen.getByRole("button", { name: /^calendar$/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^lists$/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^chores$/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^meals$/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^recipes$/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^photos$/i }),
    ).toBeInTheDocument();
  });

  it("keeps all seven destinations visible without horizontal scrolling", () => {
    render(<MobileBottomNav />);

    const navItems = screen.getByRole("navigation", {
      name: /primary/i,
    }).firstElementChild;
    const buttons = screen.getAllByRole("button");

    expect(navItems).toHaveClass("grid", "grid-cols-7");
    expect(navItems).not.toHaveClass("overflow-x-auto");
    for (const button of buttons) {
      expect(button).toHaveClass("min-w-0");
      expect(button).not.toHaveClass("min-w-16");
    }
  });

  it("switches modules through the app store", async () => {
    const { user } = renderWithUser(<MobileBottomNav />);

    await user.click(screen.getByRole("button", { name: /^photos$/i }));
    expect(useAppStore.getState().activeModule).toBe("photos");

    await user.click(screen.getByRole("button", { name: /^home$/i }));
    expect(useAppStore.getState().activeModule).toBeNull();
  });
});

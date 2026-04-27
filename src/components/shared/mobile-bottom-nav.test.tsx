import { beforeEach, describe, expect, it } from "vitest";
import { useAppStore } from "@/stores";
import { render, renderWithUser, screen } from "@/test/test-utils";
import { MobileBottomNav } from "./mobile-bottom-nav";

describe("MobileBottomNav", () => {
  beforeEach(() => {
    useAppStore.setState({ activeModule: null, isSidebarOpen: false });
  });

  it("renders all six tabs and marks Home active when activeModule is null", () => {
    render(<MobileBottomNav />);

    expect(
      screen.getByRole("navigation", { name: /primary/i }),
    ).toBeInTheDocument();
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
      screen.getByRole("button", { name: /^photos$/i }),
    ).toBeInTheDocument();
  });

  it("switches modules through the app store", async () => {
    const { user } = renderWithUser(<MobileBottomNav />);

    await user.click(screen.getByRole("button", { name: /^photos$/i }));
    expect(useAppStore.getState().activeModule).toBe("photos");

    await user.click(screen.getByRole("button", { name: /^home$/i }));
    expect(useAppStore.getState().activeModule).toBeNull();
  });
});

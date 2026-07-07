import { beforeEach, describe, expect, it } from "vitest";
import { useAppStore } from "@/stores";
import { render, renderWithUser, screen } from "@/test/test-utils";
import { NavigationTabs } from "./navigation-tabs";

describe("NavigationTabs", () => {
  beforeEach(() => {
    useAppStore.setState({ activeModule: "calendar", isSidebarOpen: false });
  });

  it("renders the desktop navigation rail", () => {
    render(<NavigationTabs />);

    expect(screen.getByRole("navigation")).toHaveClass("flex", "w-20");
  });

  it('names the rail "Primary" so the e2e waitForCalendarReady helper can find it', () => {
    // e2e/helpers/test-helpers.ts waitForCalendarReady() looks up
    // getByRole("navigation", { name: /primary/i }) to land on Calendar on
    // fresh desktop loads (activeModule now defaults to Home). Renaming this
    // label will silently break that e2e branch.
    render(<NavigationTabs />);

    expect(
      screen.getByRole("navigation", { name: /primary/i }),
    ).toBeInTheDocument();
  });

  it("renders Meals and Recipes as top-level desktop modules", () => {
    render(<NavigationTabs />);

    expect(
      screen.getByRole("button", { name: /^meals$/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^recipes$/i }),
    ).toBeInTheDocument();
  });

  it("renders Home as a first-class desktop destination", () => {
    useAppStore.setState({ activeModule: "calendar", isSidebarOpen: false });
    render(<NavigationTabs />);

    expect(screen.getByRole("button", { name: /^home$/i })).toBeInTheDocument();
  });

  it("marks Home active and switches to activeModule null", async () => {
    useAppStore.setState({ activeModule: "calendar", isSidebarOpen: false });
    const { user } = renderWithUser(<NavigationTabs />);

    await user.click(screen.getByRole("button", { name: /^home$/i }));

    expect(useAppStore.getState().activeModule).toBeNull();
    expect(screen.getByRole("button", { name: /^home$/i })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});

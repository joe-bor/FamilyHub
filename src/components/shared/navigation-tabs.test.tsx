import { fireEvent, render, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useAppStore } from "@/stores";
import { NavigationTabs } from "./navigation-tabs";

describe("NavigationTabs", () => {
  beforeEach(() => {
    useAppStore.setState({ activeModule: "calendar", isSidebarOpen: false });
  });

  it("renders 5 mobile destinations", () => {
    const { container } = render(<NavigationTabs />);
    const navs = container.querySelectorAll("nav");
    const mobileNav = navs[1];

    expect(mobileNav).toBeTruthy();
    const buttons = within(mobileNav as HTMLElement).getAllByRole("button");

    expect(buttons).toHaveLength(5);
    expect(within(mobileNav as HTMLElement).queryByText("Home")).toBeNull();
  });

  it("changes active module when a mobile tab is pressed", () => {
    const { container } = render(<NavigationTabs />);
    const navs = container.querySelectorAll("nav");
    const mobileNav = navs[1] as HTMLElement;

    fireEvent.click(within(mobileNav).getByRole("button", { name: "Meals" }));

    expect(useAppStore.getState().activeModule).toBe("meals");
  });
});

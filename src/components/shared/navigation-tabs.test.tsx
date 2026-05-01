import { beforeEach, describe, expect, it } from "vitest";
import { useAppStore } from "@/stores";
import { render, screen } from "@/test/test-utils";
import { NavigationTabs } from "./navigation-tabs";

describe("NavigationTabs", () => {
  beforeEach(() => {
    useAppStore.setState({ activeModule: "calendar", isSidebarOpen: false });
  });

  it("renders the desktop navigation rail", () => {
    render(<NavigationTabs />);

    expect(screen.getByRole("navigation")).toHaveClass("flex", "w-20");
  });
});

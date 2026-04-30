import { beforeEach, describe, expect, it } from "vitest";
import { useAppStore } from "@/stores";
import { render, screen } from "@/test/test-utils";
import { NavigationTabs } from "./navigation-tabs";

describe("NavigationTabs", () => {
  beforeEach(() => {
    useAppStore.setState({ activeModule: "calendar", isSidebarOpen: false });
  });

  it("stays hidden until the desktop breakpoint", () => {
    render(<NavigationTabs />);

    expect(screen.getByRole("navigation")).toHaveClass("hidden", "md:flex");
  });
});

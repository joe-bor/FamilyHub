import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAppStore } from "@/stores";
import {
  renderWithUser,
  screen,
  seedFamilyStore,
  within,
} from "@/test/test-utils";
import { SidebarMenu } from "./sidebar-menu";

const logoutSpy = vi.fn();
vi.mock("@/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api")>();
  return { ...actual, useLogout: () => logoutSpy };
});

describe("SidebarMenu", () => {
  beforeEach(() => {
    logoutSpy.mockClear();
    seedFamilyStore({
      name: "Test Family",
      members: [{ id: "m1", name: "Alice", color: "coral" }],
    });
    useAppStore.setState({ isSidebarOpen: true });
  });

  it("closes on Escape", async () => {
    const { user } = renderWithUser(<SidebarMenu />);
    expect(screen.getByText("Test Family")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(useAppStore.getState().isSidebarOpen).toBe(false);
  });

  it("orders menu rows: Family Settings, Preferences, Sign Out", () => {
    renderWithUser(<SidebarMenu />);

    const nav = screen.getByRole("navigation");
    const labels = within(nav)
      .getAllByRole("button")
      .map((button) => button.textContent?.trim());
    expect(labels).toEqual(["Family Settings", "Preferences", "Sign Out"]);
  });

  it("opens the Preferences sheet from the Preferences row", async () => {
    const { user } = renderWithUser(<SidebarMenu />);

    await user.click(screen.getByRole("button", { name: "Preferences" }));

    expect(
      screen.getByRole("dialog", { name: "Preferences" }),
    ).toBeInTheDocument();
  });

  it("requires confirmation before signing out", async () => {
    const { user } = renderWithUser(<SidebarMenu />);
    await user.click(screen.getByRole("button", { name: /sign out/i }));
    expect(logoutSpy).not.toHaveBeenCalled();

    // confirmation dialog appears
    await user.click(
      screen.getByRole("button", { name: /^sign out$/i, hidden: false }),
    );
    expect(logoutSpy).toHaveBeenCalledTimes(1);
  });
});

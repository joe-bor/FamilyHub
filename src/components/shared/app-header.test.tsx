import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAppStore, useCalendarStore } from "@/stores";
import {
  render,
  renderWithUser,
  screen,
  seedCalendarStore,
  seedFamilyStore,
} from "@/test/test-utils";
import { AppHeader } from "./app-header";

vi.mock("@/hooks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/hooks")>();
  return { ...actual, useIsMobile: () => true };
});

describe("AppHeader (mobile)", () => {
  beforeEach(() => {
    seedFamilyStore({
      name: "Test Family",
      members: [{ id: "m1", name: "Alice", color: "coral" }],
    });
  });

  it("shows the family name on Home (no active module)", () => {
    useAppStore.setState({ activeModule: null });
    render(<AppHeader />);
    expect(screen.getByText("Test Family")).toBeInTheDocument();
  });

  it("shows the module name when a non-calendar module is active", () => {
    useAppStore.setState({ activeModule: "chores" });
    render(<AppHeader />);
    expect(screen.getByText("Chores")).toBeInTheDocument();
    expect(screen.queryByText("Test Family")).toBeNull();
  });

  it("shows the live calendar context label on Calendar", () => {
    useAppStore.setState({ activeModule: "calendar" });
    seedCalendarStore({
      calendarView: "monthly",
      currentDate: new Date(2026, 5, 11),
    });
    render(<AppHeader />);
    expect(screen.getByText("June 2026")).toBeInTheDocument();
  });

  it("exposes exactly one header control (Menu) outside Calendar", () => {
    useAppStore.setState({ activeModule: "lists" });
    render(<AppHeader />);
    expect(screen.getByRole("button", { name: /menu/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /today/i })).toBeNull();
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });

  it("renders Today + Menu on Calendar and Today resets the date", async () => {
    useAppStore.setState({ activeModule: "calendar" });
    seedCalendarStore({
      calendarView: "monthly",
      currentDate: new Date(2020, 0, 1),
    });
    const { user } = renderWithUser(<AppHeader />);

    expect(screen.getByRole("button", { name: /menu/i })).toBeInTheDocument();
    const today = screen.getByRole("button", { name: /today/i });
    expect(today).toBeInTheDocument();

    await user.click(today);
    expect(useCalendarStore.getState().currentDate.getFullYear()).toBe(
      new Date().getFullYear(),
    );
  });
});

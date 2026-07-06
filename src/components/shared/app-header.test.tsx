import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAppStore, useCalendarStore } from "@/stores";
import {
  act,
  render,
  renderWithUser,
  screen,
  seedCalendarStore,
  seedFamilyStore,
} from "@/test/test-utils";
import { AppHeader } from "./app-header";

const isMobileMock = vi.fn(() => true);
vi.mock("@/hooks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/hooks")>();
  return { ...actual, useIsMobile: () => isMobileMock() };
});

describe("AppHeader (mobile)", () => {
  beforeEach(() => {
    isMobileMock.mockReturnValue(true);
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

  it("updates the calendar context label live as the view and date change", () => {
    useAppStore.setState({ activeModule: "calendar" });
    seedCalendarStore({
      calendarView: "monthly",
      currentDate: new Date(2026, 5, 11),
    });
    render(<AppHeader />);
    expect(screen.getByText("June 2026")).toBeInTheDocument();

    // Switching to the daily view + a new date should re-render the label.
    act(() => {
      seedCalendarStore({
        calendarView: "daily",
        currentDate: new Date(2026, 6, 4),
      });
    });
    expect(screen.queryByText("June 2026")).toBeNull();
    expect(screen.getByText(/Jul 4/)).toBeInTheDocument();

    // And navigating to a different month while monthly updates it again.
    act(() => {
      seedCalendarStore({
        calendarView: "monthly",
        currentDate: new Date(2026, 11, 25),
      });
    });
    expect(screen.getByText("December 2026")).toBeInTheDocument();
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
    const current = useCalendarStore.getState().currentDate;
    const now = new Date();
    expect(current.getFullYear()).toBe(now.getFullYear());
    expect(current.getMonth()).toBe(now.getMonth());
    expect(current.getDate()).toBe(now.getDate());
  });
});

describe("AppHeader (desktop)", () => {
  beforeEach(() => {
    isMobileMock.mockReturnValue(false);
    seedFamilyStore({
      name: "Test Family",
      members: [{ id: "m1", name: "Alice", color: "coral" }],
    });
  });

  it("renders the family name and member dots", () => {
    render(<AppHeader />);
    expect(screen.getByText("Test Family")).toBeInTheDocument();
    expect(screen.getByTitle("Alice")).toBeInTheDocument();
  });

  it("does not render the fake weather chip", () => {
    render(<AppHeader />);
    expect(screen.queryByText(/72°/)).not.toBeInTheDocument();
  });

  it("opens the sidebar when the Menu button is clicked", async () => {
    const { user } = renderWithUser(<AppHeader />);
    expect(useAppStore.getState().isSidebarOpen).toBe(false);

    await user.click(screen.getByRole("button", { name: /menu/i }));

    expect(useAppStore.getState().isSidebarOpen).toBe(true);
  });
});

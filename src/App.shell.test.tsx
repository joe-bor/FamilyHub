import FamilyHub from "./App";
import { useAppStore } from "./stores";
import {
  render,
  screen,
  seedAuthStore,
  seedFamilyStore,
  waitFor,
} from "./test/test-utils";

function setMobile(isMobile: boolean) {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: isMobile ? 390 : 1024,
  });
  vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
    matches: isMobile && query.includes("max-width: 639px"),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

describe("App shell", () => {
  beforeEach(() => {
    seedAuthStore({ isAuthenticated: true });
    seedFamilyStore({
      name: "Test Family",
      members: [{ id: "m1", name: "Alex", color: "coral" }],
    });
  });

  it("renders mobile bottom nav with Home active on mobile home", async () => {
    setMobile(true);
    useAppStore.setState({ activeModule: null, isSidebarOpen: false });

    render(<FamilyHub />);

    expect(
      await screen.findByRole("navigation", { name: /primary/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^home$/i })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("button", { name: /^menu$/i })).toBeInTheDocument();
  });

  it("suppresses AppHeader on mobile calendar while keeping bottom nav", async () => {
    setMobile(true);
    useAppStore.setState({ activeModule: "calendar", isSidebarOpen: false });

    render(<FamilyHub />);

    expect(
      await screen.findByRole("navigation", { name: /primary/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: /test family/i }),
    ).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^home$/i })).toHaveLength(1);
    expect(screen.getByRole("button", { name: /^menu$/i })).toBeInTheDocument();
  });

  it("does not render bottom nav on desktop", async () => {
    setMobile(false);
    useAppStore.setState({ activeModule: "calendar", isSidebarOpen: false });

    render(<FamilyHub />);

    await waitFor(() => {
      expect(useAppStore.getState().activeModule).toBe("calendar");
    });
    expect(
      screen.queryByRole("navigation", { name: /primary/i }),
    ).not.toBeInTheDocument();
  });

  it("does not render bottom nav on login screen", async () => {
    setMobile(true);
    seedAuthStore({ isAuthenticated: false });

    render(<FamilyHub />);

    expect(await screen.findByText("Welcome Back!")).toBeInTheDocument();
    expect(
      screen.queryByRole("navigation", { name: /primary/i }),
    ).not.toBeInTheDocument();
  });
});

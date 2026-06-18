import FamilyHub from "./App";
import { useAppStore } from "./stores";
import {
  act,
  render,
  screen,
  seedAuthStore,
  seedFamilyStore,
  waitFor,
} from "./test/test-utils";

function setViewportWidth(width: number) {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: width,
  });

  vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
    matches: (() => {
      const maxWidth = Number.parseInt(
        query.match(/max-width:\s*(\d+)px/)?.[1] ?? "",
        10,
      );
      const minWidth = Number.parseInt(
        query.match(/min-width:\s*(\d+)px/)?.[1] ?? "",
        10,
      );

      const matchesMax = Number.isNaN(maxWidth) || width <= maxWidth;
      const matchesMin = Number.isNaN(minWidth) || width >= minWidth;
      return matchesMax && matchesMin;
    })(),
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
    setViewportWidth(768);
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

  it("does not render the desktop rail at the 768px mobile boundary", async () => {
    setViewportWidth(768);
    useAppStore.setState({ activeModule: null, isSidebarOpen: false });

    render(<FamilyHub />);

    expect(
      await screen.findByRole("navigation", { name: /primary/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/^calendar$/i)).toHaveLength(1);
  });

  it("renders the module-aware AppHeader on mobile calendar alongside bottom nav", async () => {
    setViewportWidth(768);
    useAppStore.setState({ activeModule: "calendar", isSidebarOpen: false });

    render(<FamilyHub />);

    expect(
      await screen.findByRole("navigation", { name: /primary/i }),
    ).toBeInTheDocument();
    // Calendar header shows the context label, not the family name.
    expect(
      screen.queryByRole("heading", { name: /test family/i }),
    ).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^home$/i })).toHaveLength(1);
    // Header carries the calendar Today action + a single Menu button.
    expect(screen.getByRole("button", { name: /today/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^menu$/i })).toBeInTheDocument();
  });

  it("does not render bottom nav on desktop", async () => {
    setViewportWidth(769);
    useAppStore.setState({ activeModule: "calendar", isSidebarOpen: false });

    render(<FamilyHub />);

    await waitFor(() => {
      expect(useAppStore.getState().activeModule).toBe("calendar");
    });
    expect(
      screen.queryByRole("navigation", { name: /primary/i }),
    ).not.toBeInTheDocument();
  });

  it("renders the Recipes module when recipes is active", async () => {
    setViewportWidth(769);
    useAppStore.setState({ activeModule: "recipes", isSidebarOpen: false });

    render(<FamilyHub />);

    expect(
      await screen.findByRole("heading", { name: /^recipes$/i }),
    ).toBeInTheDocument();
  });

  it("does not render bottom nav on login screen", async () => {
    setViewportWidth(768);
    seedAuthStore({ isAuthenticated: false });

    render(<FamilyHub />);

    expect(await screen.findByText("Welcome Back!")).toBeInTheDocument();
    expect(
      screen.queryByRole("navigation", { name: /primary/i }),
    ).not.toBeInTheDocument();
  });

  it("hardware back steps up to Home from a module (Android standalone)", async () => {
    // setViewportWidth's matchMedia mock returns true for non-dimension queries,
    // which satisfies the Android back gate (isStandalone + coarse pointer) for
    // this integration check. The gate's exclusivity (iOS/desktop/disabled
    // no-ops) is unit-tested in use-android-back-button.test.ts.
    setViewportWidth(768);
    useAppStore.setState({ activeModule: "calendar", isSidebarOpen: false });

    render(<FamilyHub />);
    await screen.findByRole("navigation", { name: /primary/i });

    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    expect(useAppStore.getState().activeModule).toBeNull();
  });

  it("animates the module container when the active module changes", () => {
    // Mobile width so Home (null) is valid; reduced-motion OFF so ScreenTransition animates.
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("max-width"),
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    const animateMock = vi.fn();
    (Element.prototype as unknown as { animate: unknown }).animate =
      animateMock;

    useAppStore.setState({ activeModule: "calendar", isSidebarOpen: false });
    render(<FamilyHub />);

    // Switch between two eager modules so the container's token changes (no lazy/Suspense).
    act(() => {
      useAppStore.getState().setActiveModule(null);
    });

    expect(animateMock).toHaveBeenCalled();
  });
});

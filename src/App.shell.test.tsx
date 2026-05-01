import FamilyHub from "./App";
import { useAppStore } from "./stores";
import {
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

  it("suppresses AppHeader on mobile calendar while keeping bottom nav", async () => {
    setViewportWidth(768);
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

  it("does not render bottom nav on login screen", async () => {
    setViewportWidth(768);
    seedAuthStore({ isAuthenticated: false });

    render(<FamilyHub />);

    expect(await screen.findByText("Welcome Back!")).toBeInTheDocument();
    expect(
      screen.queryByRole("navigation", { name: /primary/i }),
    ).not.toBeInTheDocument();
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAppStore } from "@/stores";
import {
  render,
  screen,
  seedAuthStore,
  seedFamilyStore,
} from "@/test/test-utils";
import FamilyHub from "./App";

const viewport = vi.hoisted(() => ({ isMobile: false }));

vi.mock("@/hooks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/hooks")>();
  return {
    ...actual,
    useIsMobile: () => viewport.isMobile,
    useAndroidBackButton: () => undefined,
    useGoogleAuthReturn: () => undefined,
  };
});

vi.mock("@/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api")>();
  return {
    ...actual,
    useSetupComplete: () => true,
  };
});

vi.mock("@/components/home", () => ({
  HomeDashboard: () => <div data-testid="home-dashboard">Large Home</div>,
}));

vi.mock("@/components/calendar", () => ({
  CalendarModule: () => <div data-testid="calendar-module">Calendar</div>,
}));

vi.mock("@/components/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/components/shared")>();
  return {
    ...actual,
    OfflineBanner: () => null,
    SidebarMenu: () => null,
  };
});

describe("FamilyHub large-screen Home shell", () => {
  beforeEach(() => {
    viewport.isMobile = false;
    seedAuthStore({ isAuthenticated: true });
    seedFamilyStore({
      name: "Test Family",
      members: [{ id: "m1", name: "Alice", color: "coral" }],
    });
    useAppStore.setState({ activeModule: null, isSidebarOpen: false });
  });

  it("keeps activeModule null on non-mobile launch and renders Home", async () => {
    render(<FamilyHub />);

    expect(await screen.findByTestId("home-dashboard")).toBeInTheDocument();
    expect(screen.queryByTestId("calendar-module")).not.toBeInTheDocument();
    expect(useAppStore.getState().activeModule).toBeNull();
  });

  it("still renders Calendar when Calendar is manually active", async () => {
    useAppStore.setState({ activeModule: "calendar" });

    render(<FamilyHub />);

    expect(await screen.findByTestId("calendar-module")).toBeInTheDocument();
    expect(screen.queryByTestId("home-dashboard")).not.toBeInTheDocument();
  });
});

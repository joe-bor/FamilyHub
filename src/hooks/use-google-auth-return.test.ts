import { renderHook } from "@testing-library/react";
import { useGoogleAuthReturn } from "./use-google-auth-return";

const mockToast = vi.fn();
vi.mock("@/components/ui/toaster", () => ({
  toast: (...args: unknown[]) => mockToast(...args),
}));

const mockOpenSidebar = vi.fn();
vi.mock("@/stores", () => ({
  useAppStore: {
    getState: () => ({ openSidebar: mockOpenSidebar }),
  },
}));

describe("useGoogleAuthReturn", () => {
  let replaceStateSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    replaceStateSpy = vi
      .spyOn(window.history, "replaceState")
      .mockImplementation(() => {});
  });

  afterEach(() => {
    replaceStateSpy.mockRestore();
    Object.defineProperty(window, "location", {
      value: { ...window.location, search: "" },
      writable: true,
    });
  });

  it("does nothing when no google-auth query param", () => {
    renderHook(() => useGoogleAuthReturn());
    expect(mockToast).not.toHaveBeenCalled();
  });

  it("shows success toast on googleConnected=true", () => {
    Object.defineProperty(window, "location", {
      value: { ...window.location, search: "?googleConnected=true" },
      writable: true,
    });

    sessionStorage.setItem(
      "google-auth-return",
      JSON.stringify({
        memberId: "m1",
        returnTo: "member-profile",
        timestamp: Date.now(),
      }),
    );

    renderHook(() => useGoogleAuthReturn());
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: expect.stringContaining("Connected") }),
    );
  });

  it("shows error toast on error param", () => {
    Object.defineProperty(window, "location", {
      value: { ...window.location, search: "?error=consent_denied" },
      writable: true,
    });

    renderHook(() => useGoogleAuthReturn());
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: "destructive" }),
    );
  });

  it("cleans up query params and sessionStorage", () => {
    Object.defineProperty(window, "location", {
      value: { ...window.location, search: "?googleConnected=true" },
      writable: true,
    });

    sessionStorage.setItem(
      "google-auth-return",
      JSON.stringify({ memberId: "m1", timestamp: Date.now() }),
    );

    renderHook(() => useGoogleAuthReturn());

    expect(replaceStateSpy).toHaveBeenCalled();
    expect(sessionStorage.getItem("google-auth-return")).toBeNull();
  });
});

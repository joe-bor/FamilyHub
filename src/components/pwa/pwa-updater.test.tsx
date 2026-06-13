import { Toaster } from "@/components/ui/toaster";
import { act, renderWithUser, screen } from "@/test/test-utils";

const { updateServiceWorker, captured } = vi.hoisted(() => ({
  updateServiceWorker: vi.fn(),
  captured: {} as {
    onNeedRefresh?: () => void;
    onOfflineReady?: () => void;
  },
}));

vi.mock("virtual:pwa-register/react", () => ({
  useRegisterSW: (opts: {
    onNeedRefresh?: () => void;
    onOfflineReady?: () => void;
  }) => {
    captured.onNeedRefresh = opts.onNeedRefresh;
    captured.onOfflineReady = opts.onOfflineReady;
    return { updateServiceWorker };
  },
}));

import { PWAUpdater } from "./pwa-updater";

describe("PWAUpdater", () => {
  it("shows an update toast with a Reload action that updates the SW", async () => {
    const { user } = renderWithUser(
      <>
        <PWAUpdater />
        <Toaster />
      </>,
    );

    // Simulate vite-plugin-pwa signaling a waiting service worker.
    act(() => {
      captured.onNeedRefresh?.();
    });

    expect(screen.getByText("Update available")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /reload/i }));
    expect(updateServiceWorker).toHaveBeenCalledWith(true);
  });
});

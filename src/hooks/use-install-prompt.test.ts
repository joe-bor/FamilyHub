import type { BeforeInstallPromptEvent } from "@/lib/pwa";
import { act, renderHook, waitFor } from "@/test/test-utils";
import {
  resetInstallPromptCaptureForTests,
  startInstallPromptCapture,
  useInstallPrompt,
} from "./use-install-prompt";

function makeBeforeInstallPromptEvent() {
  const event = new Event("beforeinstallprompt") as BeforeInstallPromptEvent & {
    prompt: ReturnType<typeof vi.fn>;
  };
  (event as { prompt: unknown }).prompt = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(event, "userChoice", {
    value: Promise.resolve({ outcome: "accepted", platform: "web" }),
  });
  return event;
}

describe("useInstallPrompt", () => {
  // The capture singleton lives at module scope; reset it (and its window
  // listeners) between tests so each case starts from a clean slate.
  afterEach(() => {
    resetInstallPromptCaptureForTests();
  });

  it("captures beforeinstallprompt fired before the consumer mounts", () => {
    startInstallPromptCapture(); // root capture active from bootstrap
    window.dispatchEvent(makeBeforeInstallPromptEvent()); // BEFORE renderHook

    const { result } = renderHook(() => useInstallPrompt());

    expect(result.current.canInstall).toBe(true);
  });

  it("becomes installable after beforeinstallprompt and clears after appinstalled", async () => {
    startInstallPromptCapture();
    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.canInstall).toBe(false);

    act(() => {
      window.dispatchEvent(makeBeforeInstallPromptEvent());
    });
    await waitFor(() => expect(result.current.canInstall).toBe(true));

    act(() => {
      window.dispatchEvent(new Event("appinstalled"));
    });
    await waitFor(() => expect(result.current.canInstall).toBe(false));
  });

  it("promptInstall calls prompt() and consumes the event", async () => {
    startInstallPromptCapture();
    const { result } = renderHook(() => useInstallPrompt());
    const event = makeBeforeInstallPromptEvent();

    act(() => {
      window.dispatchEvent(event);
    });
    await waitFor(() => expect(result.current.canInstall).toBe(true));

    await act(async () => {
      await result.current.promptInstall();
    });

    expect(event.prompt).toHaveBeenCalledOnce();
    expect(result.current.canInstall).toBe(false);
  });
});

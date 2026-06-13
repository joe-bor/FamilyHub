import { useEffect, useState } from "react";
import type { BeforeInstallPromptEvent } from "@/lib/pwa";

/**
 * Captures the Chromium `beforeinstallprompt` event so the UI can offer a
 * one-tap install. `canInstall` is false on browsers that never fire it
 * (iOS Safari, Firefox) and after the app has been installed.
 */
export function useInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );

  useEffect(() => {
    const handleBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    const handleInstalled = () => setDeferred(null);

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  async function promptInstall() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null); // a captured prompt can only be used once
  }

  return { canInstall: deferred !== null, promptInstall };
}

import { useSyncExternalStore } from "react";
import type { BeforeInstallPromptEvent } from "@/lib/pwa";

/**
 * Module-level capture of the Chromium `beforeinstallprompt` event.
 *
 * Chrome fires `beforeinstallprompt` once, early, at window scope — before the
 * user ever opens the sidebar where `InstallAppRow` lives. If we only listened
 * while that component is mounted (as a hook-local `useEffect` would), the event
 * would already be gone and one-tap install could never trigger. So the capture
 * lives here as a singleton and is started once at app bootstrap (see
 * `main.tsx`), independent of any component lifecycle. The event is never
 * persisted — it is only meaningful for the current page session.
 */
let deferredPrompt: BeforeInstallPromptEvent | null = null;
const subscribers = new Set<() => void>();
let capturing = false;

function notifySubscribers() {
  for (const callback of subscribers) callback();
}

function handleBeforeInstall(event: Event) {
  event.preventDefault();
  deferredPrompt = event as BeforeInstallPromptEvent;
  notifySubscribers();
}

function handleInstalled() {
  deferredPrompt = null;
  notifySubscribers();
}

/**
 * Start capturing install-prompt events at the window scope. Idempotent: safe
 * to call more than once; only the first call attaches listeners. Call this
 * once during app bootstrap so the prompt is captured even before the consumer
 * component mounts.
 */
export function startInstallPromptCapture() {
  if (capturing) return;
  capturing = true;
  window.addEventListener("beforeinstallprompt", handleBeforeInstall);
  window.addEventListener("appinstalled", handleInstalled);
}

function subscribe(callback: () => void) {
  subscribers.add(callback);
  return () => {
    subscribers.delete(callback);
  };
}

function getSnapshot() {
  return deferredPrompt;
}

/**
 * Reads the install prompt captured by {@link startInstallPromptCapture}.
 * `canInstall` is false on browsers that never fire `beforeinstallprompt`
 * (iOS Safari, Firefox) and after the app has been installed.
 */
export function useInstallPrompt() {
  // getSnapshot doubles as the server snapshot: this is a client-only SPA, and
  // deferredPrompt is null until a real browser event arrives.
  const deferred = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  async function promptInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null; // a captured prompt can only be used once
    notifySubscribers();
  }

  return { canInstall: deferred !== null, promptInstall };
}

/**
 * Test-only: tear down the capture singleton (listeners + state) so each test
 * starts clean. Not exported from the `@/hooks` barrel; not for production use.
 */
export function resetInstallPromptCaptureForTests() {
  window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  window.removeEventListener("appinstalled", handleInstalled);
  capturing = false;
  deferredPrompt = null;
  subscribers.clear();
}

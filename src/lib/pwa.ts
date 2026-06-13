/**
 * The Chromium-only event fired when the browser deems the app installable.
 * Not in the standard DOM lib, so it's declared here.
 */
export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

/** True when the app is running as an installed/standalone PWA. */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const standaloneDisplay =
    window.matchMedia?.("(display-mode: standalone)").matches === true;
  const iosStandalone =
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return standaloneDisplay || iosStandalone;
}

/** True for iOS/iPadOS Safari, which never fires `beforeinstallprompt`. */
export function isIOS(): boolean {
  const ua = navigator.userAgent;
  const isIPhoneFamily = /iphone|ipad|ipod/i.test(ua);
  // iPadOS 13+ reports a Mac UA; disambiguate with the touch-point count.
  const isIPadOSAsMac = /macintosh/i.test(ua) && navigator.maxTouchPoints > 1;
  return isIPhoneFamily || isIPadOSAsMac;
}

import { useEffect, useRef } from "react";
import { toast } from "@/components/ui/toaster";
import { haptics } from "@/lib/haptics";
import { isIOS, isStandalone } from "@/lib/pwa";
import { useAppStore, useBackStack } from "@/stores";

const EXIT_HINT_MS = 2000;
const SENTINEL = { __familyHubBack: true } as const;

/** Installed + Android-class + touch: the only context with a hardware back. */
function isAndroidBackContext(): boolean {
  if (typeof window === "undefined") return false;
  const coarse = window.matchMedia?.("(pointer: coarse)").matches === true;
  return isStandalone() && !isIOS() && coarse;
}

/**
 * Hardware/gesture back handling for the installed Android PWA. Mount once in
 * the authenticated shell — it is the single owner of history interception.
 */
export function useAndroidBackButton(enabled: boolean): void {
  const armedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled || !isAndroidBackContext()) return;

    const rebuffer = () => window.history.pushState(SENTINEL, "");
    rebuffer(); // initial sentinel: [appEntry, sentinel]

    const onPop = () => {
      // 1. Overlay/detail layer (LIFO). The surface closes and unregisters
      //    itself via its own useBackHandler effect; we only peek.
      const top = useBackStack.getState().peek();
      if (top) {
        haptics.back();
        top.handler();
        rebuffer();
        return;
      }
      // 2. Module layer (single-root): step up to Home.
      const { activeModule, setActiveModule } = useAppStore.getState();
      if (activeModule !== null) {
        haptics.back();
        setActiveModule(null);
        rebuffer();
        return;
      }
      // 3. Home root: double-press to exit.
      if (armedRef.current) {
        armedRef.current = false;
        if (timerRef.current) clearTimeout(timerRef.current);
        // Defer so the exit runs after this popstate settles.
        setTimeout(() => window.history.back(), 0);
        return;
      }
      armedRef.current = true;
      toast({
        description: "Press back again to exit",
        duration: EXIT_HINT_MS,
      });
      timerRef.current = setTimeout(() => {
        armedRef.current = false;
      }, EXIT_HINT_MS);
      rebuffer();
    };

    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [enabled]);
}

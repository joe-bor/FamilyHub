import { useRegisterSW } from "virtual:pwa-register/react";
import { useEffect, useRef } from "react";
import { ToastAction } from "@/components/ui/toast";
import { toast } from "@/components/ui/toaster";

/**
 * Surfaces a user-controlled "update available" prompt instead of the old
 * `autoUpdate` silent reload. Renders nothing; mount once near the root.
 *
 * On a new service worker, shows a sticky toast with a Reload action that
 * applies the update (`updateServiceWorker(true)`). The user is never
 * force-reloaded mid-use.
 */
export function PWAUpdater() {
  // The Reload action's closure can't reference the same useRegisterSW call's
  // return value directly, so stash it in a ref updated after each render.
  const updateRef = useRef<(reloadPage?: boolean) => void>(() => {});

  const { updateServiceWorker } = useRegisterSW({
    onNeedRefresh() {
      toast({
        title: "Update available",
        description: "A new version of Family Hub is ready.",
        duration: Number.POSITIVE_INFINITY,
        action: (
          <ToastAction
            altText="Reload to update"
            onClick={() => updateRef.current(true)}
          >
            Reload
          </ToastAction>
        ),
      });
    },
    onOfflineReady() {
      // Honest copy: only the app shell is cached, NOT your data (Option C).
      toast({
        title: "Ready to use",
        description: "Family Hub is installed and the app shell is cached.",
      });
    },
  });

  useEffect(() => {
    updateRef.current = updateServiceWorker;
  }, [updateServiceWorker]);

  return null;
}

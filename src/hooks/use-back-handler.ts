import { useEffect, useRef } from "react";
import { useBackStack } from "@/stores";

/**
 * Register a dismiss handler on the back-stack while `enabled`. Hardware back
 * (see useAndroidBackButton) pops the most-recently-registered first (LIFO).
 * The registered wrapper always calls the latest `handler` (no stale closures);
 * it re-registers only when `enabled` flips.
 */
export function useBackHandler(enabled: boolean, handler: () => void): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  const register = useBackStack((s) => s.register);
  const unregister = useBackStack((s) => s.unregister);

  useEffect(() => {
    if (!enabled) return;
    const id = register(() => handlerRef.current());
    return () => unregister(id);
  }, [enabled, register, unregister]);
}

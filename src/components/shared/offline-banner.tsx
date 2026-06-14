import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks";

/**
 * Slim, non-blocking, honest offline indicator. With read-only offline
 * persistence (Option C), previously loaded data stays viewable from the
 * IndexedDB query cache while offline — but the app is read-only: writes are
 * blocked, not queued, until the connection returns.
 */
export function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-center gap-2 border-t border-amber-500/30 bg-amber-500/15 px-3 py-1.5 text-center text-xs font-medium text-amber-900"
    >
      <WifiOff className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      You're offline — showing saved data. Changes won't save until you
      reconnect.
    </div>
  );
}

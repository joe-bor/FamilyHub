import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks";

interface OfflineUnavailableProps {
  /** What the user was trying to view, e.g. "chores", "lists". */
  label: string;
}

/**
 * Empty state for a module that was never loaded online and therefore has no
 * cached data to show offline. Renders nothing while online so the module's own
 * loading/empty/error states apply; offline it replaces an otherwise-blank
 * panel (or infinite spinner) with an honest "not saved for offline" message.
 */
export function OfflineUnavailable({ label }: OfflineUnavailableProps) {
  const online = useOnlineStatus();
  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-12 text-center text-muted-foreground"
    >
      <WifiOff className="h-8 w-8 shrink-0" aria-hidden="true" />
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">You're offline</p>
        <p className="max-w-xs text-sm">
          Your {label} haven't been saved for offline viewing yet. Reconnect to
          load them.
        </p>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";

/**
 * Tracks browser connectivity via `navigator.onLine` and the window
 * `online`/`offline` events. Used by the offline banner to honestly reflect
 * that TanStack Query (default `networkMode: "online"`) pauses requests while
 * offline. Does NOT imply offline data caching.
 */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return online;
}

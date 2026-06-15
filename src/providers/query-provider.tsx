import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { lazy, type ReactNode, Suspense } from "react";
import { buildOfflinePersistOptions } from "@/lib/offline";
import { queryClient } from "./query-client";

// Re-exported for cross-tab sync in family-store.ts and the HTTP 401 handler.
// The instance itself lives in ./query-client (a React-free module) so it can
// be shared without pulling React into non-component modules.
export { queryClient } from "./query-client";

// Lazy load DevTools - only loaded in dev mode
const ReactQueryDevtools = lazy(() =>
  import("@tanstack/react-query-devtools").then((m) => ({
    default: m.ReactQueryDevtools,
  })),
);

// Persist successful read queries to IndexedDB so cached data renders on cold
// start and offline. Built once; the persister degrades to a no-op when
// IndexedDB is unavailable (private mode, SSR/tests).
const offlinePersistOptions = buildOfflinePersistOptions();

interface QueryProviderProps {
  children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={offlinePersistOptions}
    >
      {children}
      {import.meta.env.DEV && !import.meta.env.VITE_E2E && (
        <Suspense fallback={null}>
          <ReactQueryDevtools initialIsOpen={false} />
        </Suspense>
      )}
    </PersistQueryClientProvider>
  );
}

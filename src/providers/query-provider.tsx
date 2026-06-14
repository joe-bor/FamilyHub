import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { lazy, type ReactNode, Suspense } from "react";
import { ApiException } from "@/api/client";
import {
  buildOfflinePersistOptions,
  OFFLINE_READ_CACHE_MAX_AGE_MS,
} from "@/lib/offline";

// Lazy load DevTools - only loaded in dev mode
const ReactQueryDevtools = lazy(() =>
  import("@tanstack/react-query-devtools").then((m) => ({
    default: m.ReactQueryDevtools,
  })),
);

// Exported for cross-tab sync in family-store.ts
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      // gcTime must be >= the persistence maxAge, otherwise restored offline
      // data is garbage-collected from memory before it can be used. Shared
      // constant keeps the two in lock-step (see @/lib/offline).
      gcTime: OFFLINE_READ_CACHE_MAX_AGE_MS, // 24 hours
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors
        if (ApiException.isApiException(error)) {
          if (error.status >= 400 && error.status < 500) {
            return false;
          }
        }
        return failureCount < 3;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
      // Read-only offline: never pause/queue a mutation while offline. With the
      // default "online" mode an offline mutation would pause and silently
      // resume on reconnect — an implicit outbox. "always" makes writes fail
      // fast offline instead (and optimistic writes are blocked earlier still
      // by assertOnlineForWrite in each onMutate).
      networkMode: "always",
    },
  },
});

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

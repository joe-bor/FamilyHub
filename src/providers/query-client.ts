import { QueryClient } from "@tanstack/react-query";
// Import ApiException from the leaf module (not the `@/api/client` barrel) so
// this module can be imported by `http-client.ts` without a circular import:
// barrel → http-client → query-client → barrel.
import { ApiException } from "@/api/client/api-error";
import { OFFLINE_READ_CACHE_MAX_AGE_MS } from "@/lib/offline";

/**
 * The app-wide TanStack `QueryClient` singleton.
 *
 * Extracted from `query-provider.tsx` so it lives in a React-free module that
 * both the provider and the non-React HTTP 401 handler can import. The 401
 * handler ({@link handleUnauthorized}) needs to clear this in-memory cache
 * before wiping IndexedDB to prevent cross-account data leakage on a shared
 * device (mirroring `useLogout`).
 */
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

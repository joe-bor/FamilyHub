// Test stub for vite-plugin-pwa's `virtual:pwa-register/react` module.
// The PWA plugin is not loaded under vitest, so the real virtual module does
// not resolve. Individual tests override behavior with `vi.mock(...)`.
export interface RegisterSWOptions {
  immediate?: boolean;
  onNeedRefresh?: () => void;
  onOfflineReady?: () => void;
  onRegisteredSW?: (swUrl: string, r?: ServiceWorkerRegistration) => void;
  onRegisterError?: (error: unknown) => void;
}

export function useRegisterSW(_options?: RegisterSWOptions) {
  return {
    needRefresh: [false, () => {}] as [boolean, (value: boolean) => void],
    offlineReady: [false, () => {}] as [boolean, (value: boolean) => void],
    updateServiceWorker: async (_reloadPage?: boolean) => {},
  };
}

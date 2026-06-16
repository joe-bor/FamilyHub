import { Component, type ReactNode, Suspense } from "react";
import { OfflineUnavailable } from "./offline-unavailable";

/**
 * True when `error` is a failed dynamic `import()` of a code-split chunk — the
 * browser could not fetch or parse the module script. Matches the per-engine
 * messages plus the webpack-era `ChunkLoadError` name. Used to tell a precache
 * miss (offline) apart from a genuine runtime bug inside the module, so the
 * boundary only swallows the former.
 */
export function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (error.name === "ChunkLoadError") return true;
  const message = error.message.toLowerCase();
  return (
    // Chromium
    message.includes("failed to fetch dynamically imported module") ||
    // Firefox
    message.includes("error loading dynamically imported module") ||
    // WebKit / Safari
    message.includes("importing a module script failed")
  );
}

interface LazyModuleProps {
  /** Module label for the offline empty state, e.g. "chores". */
  label: string;
  children: ReactNode;
}

interface ChunkLoadErrorBoundaryState {
  error: Error | null;
}

/**
 * Error boundary for a lazily-loaded module. When the module's chunk fails to
 * load — the user went offline before the service worker controlled the tab
 * (first session), or a precached chunk was evicted — it renders the offline
 * empty state instead of letting the rejected `import()` crash the whole app to
 * a blank page. Non-chunk errors are re-thrown so real bugs are not masked.
 */
export class ChunkLoadErrorBoundary extends Component<
  LazyModuleProps,
  ChunkLoadErrorBoundaryState
> {
  state: ChunkLoadErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ChunkLoadErrorBoundaryState {
    return { error };
  }

  render() {
    const { error } = this.state;
    if (error) {
      if (!isChunkLoadError(error)) throw error;
      return <OfflineUnavailable label={this.props.label} />;
    }
    return this.props.children;
  }
}

function ModuleLoader() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="animate-pulse text-muted-foreground">Loading...</div>
    </div>
  );
}

/**
 * Wraps a lazily-loaded module in a Suspense boundary (loading fallback) and a
 * ChunkLoadErrorBoundary (offline / precache-miss fallback) so a chunk that
 * cannot be fetched degrades to an honest empty state instead of a blank page.
 */
export function LazyModule({ label, children }: LazyModuleProps) {
  return (
    <ChunkLoadErrorBoundary label={label}>
      <Suspense fallback={<ModuleLoader />}>{children}</Suspense>
    </ChunkLoadErrorBoundary>
  );
}

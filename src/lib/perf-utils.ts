/**
 * Performance measurement utilities for development.
 * These helpers are no-ops in production builds.
 */

/**
 * Wraps a function to measure and log its execution time.
 * Only active in development mode.
 */
export function measurePerf<T>(name: string, fn: () => T): T {
  if (import.meta.env.DEV) {
    performance.mark(`${name}-start`);
    const result = fn();
    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);
    const measure = performance.getEntriesByName(name).pop();
    console.log(`⏱️ ${name}: ${measure?.duration.toFixed(2)}ms`);
    performance.clearMarks(`${name}-start`);
    performance.clearMarks(`${name}-end`);
    performance.clearMeasures(name);
    return result;
  }
  return fn();
}

/**
 * React Profiler onRender callback for logging render metrics.
 * Use with React's <Profiler> component.
 *
 * @example
 * <Profiler id="CalendarModule" onRender={logProfilerData}>
 *   <CalendarModule />
 * </Profiler>
 */
export function logProfilerData(
  id: string,
  phase: "mount" | "update" | "nested-update",
  actualDuration: number,
  baseDuration: number,
  startTime: number,
  commitTime: number,
) {
  if (import.meta.env.DEV) {
    console.log(
      `📊 [${id}] ${phase}: ${actualDuration.toFixed(2)}ms (base: ${baseDuration.toFixed(2)}ms)`,
    );
  }
}

/**
 * Counter for tracking render counts.
 * Useful for measuring how many times a component re-renders.
 */
const renderCounts = new Map<string, number>();

export function countRender(componentName: string): void {
  if (import.meta.env.DEV) {
    const count = (renderCounts.get(componentName) ?? 0) + 1;
    renderCounts.set(componentName, count);
    console.log(`🔄 ${componentName} render #${count}`);
  }
}

export function resetRenderCounts(): void {
  renderCounts.clear();
}

export function getRenderCounts(): Map<string, number> {
  return new Map(renderCounts);
}

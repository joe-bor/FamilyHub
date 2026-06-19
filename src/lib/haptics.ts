import {
  type HapticCategory,
  useHapticsPreference,
} from "@/stores/haptics-store";

/**
 * Short, subtle patterns (ms). Single pulses for tap/back; a brief double for
 * success. Typed as `number | number[]` (not `as const`) so each value is
 * assignable to `navigator.vibrate`'s mutable `VibratePattern`.
 */
const PATTERNS: Record<HapticCategory, number | number[]> = {
  taps: 10,
  completions: [12, 40, 12],
  back: 8,
};

const THROTTLE_MS = 40; // guard against pointerdown storms / rapid repeats
let lastFireAt = Number.NEGATIVE_INFINITY;

/** Feature-detect the Vibration API. Android Chrome → true; iOS Safari + desktop → false. */
export function canVibrate(): boolean {
  return (
    typeof navigator !== "undefined" && typeof navigator.vibrate === "function"
  );
}

function fire(category: keyof typeof PATTERNS): void {
  if (!canVibrate()) return;
  const { enabled, categories } = useHapticsPreference.getState();
  if (!enabled || !categories[category]) return;
  const now = Date.now();
  if (now - lastFireAt < THROTTLE_MS) return; // coalesce rapid repeats
  lastFireAt = now;
  navigator.vibrate(PATTERNS[category]);
}

/** @internal Test-only: reset the shared throttle clock between test runs. */
export function resetHapticsThrottle(): void {
  lastFireAt = Number.NEGATIVE_INFINITY;
}

/** The only sanctioned way to vibrate. Each method no-ops unless capable + opted-in. */
export const haptics = {
  tap: () => fire("taps"),
  success: () => fire("completions"),
  back: () => fire("back"),
};

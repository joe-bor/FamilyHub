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

/**
 * Detect a device that can actually deliver haptics: the Vibration API AND a
 * touch-primary (coarse) pointer. Android Chrome PWA → true; iOS Safari → false
 * (no `navigator.vibrate`); desktop Chrome/Edge/Firefox → false too, because
 * they define a *no-op* `navigator.vibrate` on mouse-primary hardware — so the
 * function's presence alone is not a touch-device gate. Mirrors the
 * `(pointer: coarse)` check in `use-android-back-button.ts`.
 */
export function canVibrate(): boolean {
  if (
    typeof navigator === "undefined" ||
    typeof navigator.vibrate !== "function"
  ) {
    return false;
  }
  return window.matchMedia?.("(pointer: coarse)").matches === true;
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

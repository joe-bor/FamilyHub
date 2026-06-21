import { formatLocalDate } from "@/lib/time-utils";
import { HIDDEN_AT_KEY, LAST_SEEN_KEY, MEANINGFUL_GAP_MS } from "./constants";

export function isMeaningfulOpen(o: {
  coldStart: boolean;
  now: number;
  hiddenAt: number;
  lastSeen: number;
}): boolean {
  if (o.coldStart) return true;
  // Require hiddenAt > 0: the default 0 means "never hidden", which would
  // otherwise read as "hidden since 1970" and make every open meaningful.
  if (o.hiddenAt > 0 && o.now - o.hiddenAt > MEANINGFUL_GAP_MS) return true;
  return (
    formatLocalDate(new Date(o.now)) !== formatLocalDate(new Date(o.lastSeen))
  );
}

function readNum(key: string): number {
  try {
    const raw = localStorage.getItem(key);
    const n = raw ? Number(raw) : 0;
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}
function writeNum(key: string, value: number): void {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // storage unavailable (private mode / webview) — markers degrade to 0
  }
}

export const getLastSeen = () => readNum(LAST_SEEN_KEY);
export const setLastSeen = (v: number) => writeNum(LAST_SEEN_KEY, v);
export const getHiddenAt = () => readNum(HIDDEN_AT_KEY);
export const setHiddenAt = (v: number) => writeNum(HIDDEN_AT_KEY, v);

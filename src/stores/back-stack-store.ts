import { create } from "zustand";

export interface BackHandlerEntry {
  id: number;
  handler: () => void;
}

interface BackStackState {
  stack: BackHandlerEntry[];
  register: (handler: () => void) => number;
  unregister: (id: number) => void;
  peek: () => BackHandlerEntry | undefined;
}

let nextId = 0;

/**
 * LIFO registry of "dismissable now" handlers. Open surfaces register via
 * useBackHandler; useAndroidBackButton peeks the most-recent on hardware back.
 */
export const useBackStack = create<BackStackState>((set, get) => ({
  stack: [],
  register: (handler) => {
    const id = nextId++;
    set((s) => ({ stack: [...s.stack, { id, handler }] }));
    return id;
  },
  unregister: (id) =>
    set((s) => ({ stack: s.stack.filter((e) => e.id !== id) })),
  peek: () => {
    const { stack } = get();
    return stack[stack.length - 1];
  },
}));

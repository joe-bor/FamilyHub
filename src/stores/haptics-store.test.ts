import { beforeEach, describe, expect, it } from "vitest";
import { HAPTICS_STORAGE_KEY, useHapticsPreference } from "./haptics-store";

beforeEach(() => {
  localStorage.clear();
  useHapticsPreference.setState({
    enabled: false,
    categories: { taps: true, completions: true, back: true },
  });
});

describe("useHapticsPreference", () => {
  it("defaults to master off with every category on", () => {
    const s = useHapticsPreference.getState();
    expect(s.enabled).toBe(false);
    expect(s.categories).toEqual({ taps: true, completions: true, back: true });
  });

  it("setEnabled toggles the master flag", () => {
    useHapticsPreference.getState().setEnabled(true);
    expect(useHapticsPreference.getState().enabled).toBe(true);
  });

  it("setCategory toggles one category without touching the others", () => {
    useHapticsPreference.getState().setCategory("taps", false);
    expect(useHapticsPreference.getState().categories).toEqual({
      taps: false,
      completions: true,
      back: true,
    });
  });

  it("persists enabled + categories to localStorage[family-hub-haptics]", () => {
    useHapticsPreference.getState().setEnabled(true);
    useHapticsPreference.getState().setCategory("back", false);
    const persisted = JSON.parse(
      localStorage.getItem(HAPTICS_STORAGE_KEY) ?? "{}",
    );
    expect(persisted.state.enabled).toBe(true);
    expect(persisted.state.categories.back).toBe(false);
  });
});

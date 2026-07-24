import { afterEach, describe, expect, it } from "vitest";
import { resetViewportWidth, setViewportWidth } from "./test-utils";

/**
 * `setViewportWidth` is shared breakpoint infrastructure for every Calendar
 * test, so its blast radius is every query the app asks `matchMedia`, not just
 * the width ones. These cases pin the boundary.
 */
describe("setViewportWidth", () => {
  afterEach(resetViewportWidth);

  it("resolves the app's breakpoint queries from the given width", () => {
    setViewportWidth(390);
    expect(window.matchMedia("(max-width: 768px)").matches).toBe(true);
    expect(window.matchMedia("(min-width: 1024px)").matches).toBe(false);

    setViewportWidth(800);
    expect(window.matchMedia("(max-width: 768px)").matches).toBe(false);
    expect(window.matchMedia("(min-width: 1024px)").matches).toBe(false);

    setViewportWidth(1280);
    expect(window.matchMedia("(max-width: 768px)").matches).toBe(false);
    expect(window.matchMedia("(min-width: 1024px)").matches).toBe(true);
  });

  it("treats exactly 768px as mobile and 769px as tablet", () => {
    setViewportWidth(768);
    expect(window.matchMedia("(max-width: 768px)").matches).toBe(true);

    setViewportWidth(769);
    expect(window.matchMedia("(max-width: 768px)").matches).toBe(false);
    expect(window.matchMedia("(min-width: 1024px)").matches).toBe(false);
  });

  it("leaves non-width queries false at every width", () => {
    // Without an explicit guard both width parses are NaN for these, and the
    // `Number.isNaN` fallbacks would answer `true` — silently flipping
    // components into their reduced-motion or touch branch in tests that only
    // meant to pick a breakpoint.
    for (const width of [390, 800, 1280, 2560]) {
      setViewportWidth(width);
      for (const query of [
        "(prefers-reduced-motion: reduce)",
        "(pointer: coarse)",
        "(display-mode: standalone)",
        "(prefers-color-scheme: dark)",
      ]) {
        expect(window.matchMedia(query).matches).toBe(false);
      }
    }
  });

  it("keeps window.innerWidth in step for hooks that read it directly", () => {
    setViewportWidth(1280);
    expect(window.innerWidth).toBe(1280);
  });
});

describe("resetViewportWidth", () => {
  it("restores the setup.ts default of matches:false for every query", () => {
    setViewportWidth(1280);
    resetViewportWidth();

    expect(window.matchMedia("(min-width: 1024px)").matches).toBe(false);
    expect(window.matchMedia("(max-width: 768px)").matches).toBe(false);
  });
});

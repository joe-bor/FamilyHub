import { afterEach, describe, expect, it } from "vitest";
import { assertOnlineForWrite, OfflineWriteError } from "./read-only-guard";

function setOnline(value: boolean | undefined): void {
  Object.defineProperty(navigator, "onLine", {
    configurable: true,
    value,
  });
}

afterEach(() => {
  setOnline(true);
});

describe("assertOnlineForWrite", () => {
  it("does nothing when online", () => {
    setOnline(true);
    expect(() => assertOnlineForWrite()).not.toThrow();
  });

  it("throws OfflineWriteError when offline", () => {
    setOnline(false);
    expect(() => assertOnlineForWrite()).toThrow(OfflineWriteError);
  });

  it("treats unknown connectivity as online (does not block writes)", () => {
    setOnline(undefined);
    expect(() => assertOnlineForWrite()).not.toThrow();
  });
});

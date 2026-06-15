import { afterEach, describe, expect, it } from "vitest";
import { ApiErrorCode, ApiException } from "@/api/client";
import {
  assertOnlineForWrite,
  isOfflineWriteError,
  OfflineWriteError,
} from "./read-only-guard";

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

describe("OfflineWriteError", () => {
  it("is an ApiException so it matches the onError shape consumers expect", () => {
    const error = new OfflineWriteError();
    expect(error).toBeInstanceOf(ApiException);
    expect(ApiException.isApiException(error)).toBe(true);
    // Consumers reading these fields get sane values, not undefined.
    expect(error.code).toBe(ApiErrorCode.NETWORK_ERROR);
    expect(error.status).toBe(0);
    expect(error.name).toBe("OfflineWriteError");
  });

  it("is detectable via isOfflineWriteError", () => {
    expect(isOfflineWriteError(new OfflineWriteError())).toBe(true);
    expect(
      isOfflineWriteError(
        new ApiException({
          code: ApiErrorCode.SERVER_ERROR,
          message: "boom",
          status: 500,
        }),
      ),
    ).toBe(false);
    expect(isOfflineWriteError(new Error("nope"))).toBe(false);
    expect(isOfflineWriteError(null)).toBe(false);
  });
});

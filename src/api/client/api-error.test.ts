import { describe, expect, it } from "vitest";
import { ApiErrorCode, mapStatusToErrorCode } from "./api-error";

describe("mapStatusToErrorCode", () => {
  it("maps 400 to VALIDATION_ERROR", () => {
    expect(mapStatusToErrorCode(400)).toBe(ApiErrorCode.VALIDATION_ERROR);
  });

  it("maps 401 to UNAUTHORIZED", () => {
    expect(mapStatusToErrorCode(401)).toBe(ApiErrorCode.UNAUTHORIZED);
  });

  it("maps 403 to FORBIDDEN", () => {
    expect(mapStatusToErrorCode(403)).toBe(ApiErrorCode.FORBIDDEN);
  });

  it("maps 404 to NOT_FOUND", () => {
    expect(mapStatusToErrorCode(404)).toBe(ApiErrorCode.NOT_FOUND);
  });

  it("maps 409 to CONFLICT", () => {
    expect(mapStatusToErrorCode(409)).toBe(ApiErrorCode.CONFLICT);
  });

  it("maps 422 to VALIDATION_ERROR", () => {
    expect(mapStatusToErrorCode(422)).toBe(ApiErrorCode.VALIDATION_ERROR);
  });

  it("maps 5xx to SERVER_ERROR", () => {
    expect(mapStatusToErrorCode(500)).toBe(ApiErrorCode.SERVER_ERROR);
    expect(mapStatusToErrorCode(502)).toBe(ApiErrorCode.SERVER_ERROR);
    expect(mapStatusToErrorCode(503)).toBe(ApiErrorCode.SERVER_ERROR);
  });

  it("maps unknown 4xx to NETWORK_ERROR", () => {
    expect(mapStatusToErrorCode(418)).toBe(ApiErrorCode.NETWORK_ERROR);
  });
});

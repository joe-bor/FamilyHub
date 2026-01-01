import { ApiErrorCode, ApiException } from "@/api/client";

/**
 * Simulates network delay with random duration between min and max milliseconds
 */
export function delay(min = 200, max = 600): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Randomly throws a simulated network error based on failure rate
 * @param rate - Probability of failure (0-1), defaults to 0.05 (5%)
 */
export function maybeFailWithNetworkError(rate = 0.05): void {
  if (Math.random() < rate) {
    throw new ApiException({
      code: ApiErrorCode.NETWORK_ERROR,
      message: "Simulated network error",
      status: 0,
    });
  }
}

/**
 * Randomly throws a simulated server error based on failure rate
 * @param rate - Probability of failure (0-1), defaults to 0.05 (5%)
 */
export function maybeFailWithServerError(rate = 0.05): void {
  if (Math.random() < rate) {
    throw new ApiException({
      code: ApiErrorCode.SERVER_ERROR,
      message: "Simulated server error",
      status: 500,
    });
  }
}

/**
 * Combined delay and potential failure for realistic mock API behavior
 */
export async function simulateApiCall(options?: {
  delayMin?: number;
  delayMax?: number;
  failureRate?: number;
}): Promise<void> {
  // Disable random failures and reduce delay during E2E tests for stability
  const isE2E = import.meta.env.VITE_E2E === "true";
  const {
    delayMin = isE2E ? 50 : 200,
    delayMax = isE2E ? 100 : 600,
    failureRate = isE2E ? 0 : 0.05,
  } = options ?? {};

  await delay(delayMin, delayMax);
  maybeFailWithNetworkError(failureRate / 2);
  maybeFailWithServerError(failureRate / 2);
}

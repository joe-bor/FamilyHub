import { AUTH_TOKEN_STORAGE_KEY } from "@/lib/constants";
import {
  ApiErrorCode,
  ApiException,
  mapStatusToErrorCode,
  type ValidationError,
} from "./api-error";

type QueryParams = Record<string, string | number | boolean | undefined>;

/**
 * Get auth header from localStorage if token exists.
 */
function getAuthHeader(): Record<string, string> {
  try {
    const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
  } catch {
    // localStorage might not be available
  }
  return {};
}

interface RequestConfig extends Omit<RequestInit, "body"> {
  params?: QueryParams;
  timeout?: number;
}

interface HttpClientConfig {
  baseUrl: string;
  defaultHeaders?: Record<string, string>;
  onUnauthorized?: () => void;
}

async function parseErrorResponse(response: Response): Promise<{
  code: ApiErrorCode;
  message: string;
  status: number;
  errors?: ValidationError[];
  field?: string;
}> {
  try {
    const body = await response.json();
    return {
      code: mapStatusToErrorCode(response.status),
      message: body.message || response.statusText,
      status: response.status,
      errors: body.errors,
      field: body.errors?.[0]?.field,
    };
  } catch {
    return {
      code: mapStatusToErrorCode(response.status),
      message: response.statusText,
      status: response.status,
    };
  }
}

export function createHttpClient(config: HttpClientConfig) {
  const { baseUrl, defaultHeaders = {}, onUnauthorized } = config;

  async function request<T>(
    endpoint: string,
    options: RequestConfig & { body?: unknown } = {},
  ): Promise<T> {
    const { params, timeout = 30000, body, ...fetchOptions } = options;

    // Build URL with query params
    const url = new URL(endpoint, baseUrl);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    // Setup abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url.toString(), {
        ...fetchOptions,
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...defaultHeaders,
          ...getAuthHeader(),
          ...fetchOptions.headers,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await parseErrorResponse(response);

        if (response.status === 401 && onUnauthorized) {
          onUnauthorized();
        }

        throw new ApiException(error);
      }

      // Handle empty responses (204 No Content)
      if (response.status === 204) {
        return undefined as T;
      }

      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);

      if (ApiException.isApiException(error)) {
        throw error;
      }

      if (error instanceof DOMException && error.name === "AbortError") {
        throw new ApiException({
          code: ApiErrorCode.TIMEOUT,
          message: "Request timed out",
          status: 408,
        });
      }

      throw new ApiException(
        {
          code: ApiErrorCode.NETWORK_ERROR,
          message: "Network error occurred",
          status: 0,
        },
        error,
      );
    }
  }

  return {
    get: <T>(endpoint: string, config?: RequestConfig) =>
      request<T>(endpoint, { ...config, method: "GET" }),

    post: <T>(endpoint: string, data?: unknown, config?: RequestConfig) =>
      request<T>(endpoint, {
        ...config,
        method: "POST",
        body: data,
      }),

    put: <T>(endpoint: string, data?: unknown, config?: RequestConfig) =>
      request<T>(endpoint, {
        ...config,
        method: "PUT",
        body: data,
      }),

    patch: <T>(endpoint: string, data?: unknown, config?: RequestConfig) =>
      request<T>(endpoint, {
        ...config,
        method: "PATCH",
        body: data,
      }),

    delete: <T>(endpoint: string, config?: RequestConfig) =>
      request<T>(endpoint, { ...config, method: "DELETE" }),
  };
}

// Singleton instance for the app
export const httpClient = createHttpClient({
  baseUrl: import.meta.env.VITE_API_BASE_URL || "/api",
  onUnauthorized: () => {
    // Clear token and reload to show login
    try {
      localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    } catch {
      // localStorage might not be available
    }
    window.location.reload();
  },
});

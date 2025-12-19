export const ApiErrorCode = {
  NETWORK_ERROR: "NETWORK_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  CONFLICT: "CONFLICT",
  SERVER_ERROR: "SERVER_ERROR",
  TIMEOUT: "TIMEOUT",
} as const

export type ApiErrorCode = (typeof ApiErrorCode)[keyof typeof ApiErrorCode]

export interface ApiErrorDetails {
  code: ApiErrorCode
  message: string
  status: number
  details?: Record<string, unknown>
  field?: string
}

export class ApiException extends Error {
  readonly code: ApiErrorCode
  readonly status: number
  readonly details?: Record<string, unknown>
  readonly field?: string
  readonly originalError?: unknown

  constructor(error: ApiErrorDetails, originalError?: unknown) {
    super(error.message)
    this.name = "ApiException"
    this.code = error.code
    this.status = error.status
    this.details = error.details
    this.field = error.field
    this.originalError = originalError
  }

  static isApiException(error: unknown): error is ApiException {
    return error instanceof ApiException
  }
}

export function mapStatusToErrorCode(status: number): ApiErrorCode {
  switch (status) {
    case 401:
      return ApiErrorCode.UNAUTHORIZED
    case 403:
      return ApiErrorCode.FORBIDDEN
    case 404:
      return ApiErrorCode.NOT_FOUND
    case 409:
      return ApiErrorCode.CONFLICT
    case 422:
      return ApiErrorCode.VALIDATION_ERROR
    default:
      return status >= 500 ? ApiErrorCode.SERVER_ERROR : ApiErrorCode.NETWORK_ERROR
  }
}

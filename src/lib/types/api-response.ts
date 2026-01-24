/**
 * Unified API response wrapper.
 * All API responses use this consistent shape.
 */
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

import type { ApiResponse } from "./api-response";
import type { FamilyData, FamilyMember } from "./family";

// ============================================================================
// Auth Request/Response Types
// ============================================================================

/**
 * Request to login with family credentials.
 */
export interface LoginRequest {
  username: string;
  password: string;
}

/**
 * Response from successful login.
 * Returns JWT token and associated family data.
 */
export type LoginResponse = ApiResponse<{
  token: string;
  family: FamilyData;
}>;

/**
 * Request to register a new family with credentials.
 * Combines family creation with credential setup.
 */
export interface RegisterRequest {
  username: string;
  password: string;
  familyName: string;
  members: Array<Omit<FamilyMember, "id">>;
}

/**
 * Response from successful registration.
 * Returns JWT token and created family data.
 */
export type RegisterResponse = ApiResponse<{
  token: string;
  family: FamilyData;
}>;

/**
 * Response from username availability check.
 */
export type UsernameCheckResponse = ApiResponse<{ available: boolean }>;

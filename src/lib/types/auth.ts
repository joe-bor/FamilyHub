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
export interface LoginResponse {
  data: {
    token: string;
    family: FamilyData;
  };
  message: string;
}

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
export interface RegisterResponse {
  data: {
    token: string;
    family: FamilyData;
  };
  message: string;
}

/**
 * Response from username availability check.
 */
export interface UsernameCheckResponse {
  available: boolean;
}

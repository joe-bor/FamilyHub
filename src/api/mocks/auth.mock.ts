import { ApiErrorCode, ApiException } from "@/api/client";
import {
  AUTH_TOKEN_STORAGE_KEY,
  FAMILY_STORAGE_KEY,
  MOCK_USERS_STORAGE_KEY,
} from "@/lib/constants";
import type {
  FamilyData,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  UsernameCheckResponse,
} from "@/lib/types";
import { simulateApiCall } from "./delay";

// ============================================================================
// Mock User Types
// ============================================================================

interface MockUser {
  username: string;
  passwordHash: string; // In mock, stored as plain text for simplicity
  familyId: string;
}

// ============================================================================
// Persistence Helpers
// ============================================================================

/**
 * Load mock users from localStorage.
 */
function loadUsersFromStorage(): MockUser[] {
  try {
    const stored = localStorage.getItem(MOCK_USERS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Save mock users to localStorage.
 */
function saveUsersToStorage(users: MockUser[]): void {
  try {
    localStorage.setItem(MOCK_USERS_STORAGE_KEY, JSON.stringify(users));
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("Failed to save users to localStorage:", error);
    }
  }
}

/**
 * Load family data from localStorage.
 */
function loadFamilyFromStorage(): FamilyData | null {
  try {
    const stored = localStorage.getItem(FAMILY_STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return parsed?.state?.family ?? null;
  } catch {
    return null;
  }
}

/**
 * Save family data to localStorage.
 * Matches the Zustand persist format for compatibility.
 */
function saveFamilyToStorage(family: FamilyData): void {
  try {
    const stored = {
      state: {
        family,
        _hasHydrated: true,
      },
      version: 0,
    };
    localStorage.setItem(FAMILY_STORAGE_KEY, JSON.stringify(stored));
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("Failed to save family to localStorage:", error);
    }
  }
}

/**
 * Save auth token to localStorage.
 */
function saveTokenToStorage(token: string): void {
  try {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("Failed to save token to localStorage:", error);
    }
  }
}

// ============================================================================
// Token Generation
// ============================================================================

/**
 * Generate a mock JWT token.
 * Not cryptographically valid - just for mock API simulation.
 */
function generateMockToken(username: string, familyId: string): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = btoa(
    JSON.stringify({
      sub: username,
      familyId,
      iat: Date.now(),
      // 1 year expiration for long-lived token
      exp: Date.now() + 365 * 24 * 60 * 60 * 1000,
    }),
  );
  const signature = btoa(`mock-signature-${username}`);
  return `${header}.${payload}.${signature}`;
}

// ============================================================================
// Mock Handlers
// ============================================================================

export const authMockHandlers = {
  /**
   * Login with username and password.
   * Returns JWT token and associated family data.
   */
  async login(request: LoginRequest): Promise<LoginResponse> {
    await simulateApiCall({ delayMin: 300, delayMax: 600 });

    const users = loadUsersFromStorage();
    const normalizedUsername = request.username.toLowerCase().trim();
    const user = users.find((u) => u.username === normalizedUsername);

    // Check credentials
    if (!user || user.passwordHash !== request.password) {
      throw new ApiException({
        code: ApiErrorCode.UNAUTHORIZED,
        message: "Invalid username or password",
        status: 401,
      });
    }

    // Load associated family data
    const family = loadFamilyFromStorage();
    if (!family || family.id !== user.familyId) {
      throw new ApiException({
        code: ApiErrorCode.NOT_FOUND,
        message: "Family data not found",
        status: 404,
      });
    }

    const token = generateMockToken(user.username, user.familyId);

    // Save token to storage (simulating server-side session)
    saveTokenToStorage(token);

    return {
      data: { token, family },
      message: "Login successful",
    };
  },

  /**
   * Register a new family with credentials.
   * Creates both user credentials and family data.
   */
  async register(request: RegisterRequest): Promise<RegisterResponse> {
    await simulateApiCall({ delayMin: 400, delayMax: 800 });

    const users = loadUsersFromStorage();
    const normalizedUsername = request.username.toLowerCase().trim();

    // Check if username already exists
    if (users.some((u) => u.username === normalizedUsername)) {
      throw new ApiException({
        code: ApiErrorCode.CONFLICT,
        message: "Username already taken",
        status: 409,
        field: "username",
      });
    }

    // Check if family already exists
    const existingFamily = loadFamilyFromStorage();
    if (existingFamily) {
      throw new ApiException({
        code: ApiErrorCode.CONFLICT,
        message: "Family already exists",
        status: 409,
      });
    }

    // Create family data
    const family: FamilyData = {
      id: crypto.randomUUID(),
      name: request.familyName,
      members: request.members.map((m) => ({
        ...m,
        id: crypto.randomUUID(),
      })),
      createdAt: new Date().toISOString(),
      setupComplete: true,
    };

    // Create user credentials
    const newUser: MockUser = {
      username: normalizedUsername,
      passwordHash: request.password, // In real API, this would be hashed
      familyId: family.id,
    };

    // Save both to storage
    saveFamilyToStorage(family);
    saveUsersToStorage([...users, newUser]);

    const token = generateMockToken(normalizedUsername, family.id);

    // Save token to storage
    saveTokenToStorage(token);

    return {
      data: { token, family },
      message: "Registration successful",
    };
  },

  /**
   * Check if a username is available.
   */
  async checkUsername(username: string): Promise<UsernameCheckResponse> {
    await simulateApiCall({ delayMin: 100, delayMax: 200 });

    const users = loadUsersFromStorage();
    const normalizedUsername = username.toLowerCase().trim();
    const available = !users.some((u) => u.username === normalizedUsername);

    return { data: { available } };
  },

  // ============================================================================
  // Utility Methods (for testing)
  // ============================================================================

  /**
   * Reset all auth-related mock data.
   */
  resetMockData(): void {
    localStorage.removeItem(MOCK_USERS_STORAGE_KEY);
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  },
};

import { httpClient } from "@/api/client";
import { authMockHandlers, USE_MOCK_API } from "@/api/mocks";
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  UsernameCheckResponse,
} from "@/lib/types";

export const authService = {
  /**
   * Login with username and password.
   * Returns JWT token and associated family data.
   */
  async login(request: LoginRequest): Promise<LoginResponse> {
    if (USE_MOCK_API) {
      return authMockHandlers.login(request);
    }
    return httpClient.post<LoginResponse>("/auth/login", request);
  },

  /**
   * Register a new family with credentials.
   * Creates both user credentials and family data.
   */
  async register(request: RegisterRequest): Promise<RegisterResponse> {
    if (USE_MOCK_API) {
      return authMockHandlers.register(request);
    }
    return httpClient.post<RegisterResponse>("/auth/register", request);
  },

  /**
   * Check if a username is available.
   */
  async checkUsername(username: string): Promise<UsernameCheckResponse> {
    if (USE_MOCK_API) {
      return authMockHandlers.checkUsername(username);
    }
    return httpClient.get<UsernameCheckResponse>("/auth/check-username", {
      params: { username },
    });
  },
};

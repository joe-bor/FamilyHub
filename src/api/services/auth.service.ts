import { httpClient } from "@/api/client";
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
    return httpClient.post<LoginResponse>("/auth/login", request);
  },

  /**
   * Register a new family with credentials.
   * Creates both user credentials and family data.
   */
  async register(request: RegisterRequest): Promise<RegisterResponse> {
    return httpClient.post<RegisterResponse>("/auth/register", request);
  },

  /**
   * Check if a username is available.
   */
  async checkUsername(username: string): Promise<UsernameCheckResponse> {
    return httpClient.get<UsernameCheckResponse>("/auth/check-username", {
      params: { username },
    });
  },
};

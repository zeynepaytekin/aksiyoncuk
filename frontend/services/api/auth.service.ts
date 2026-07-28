import { apiRequest } from "@/services/api/apiClient";
import type {
  AuthResponse,
  AuthUser,
  LoginRequest,
  RefreshRequest,
  RegistrationRequest,
  RegistrationResponse,
} from "@/types/auth";

export type AuthService = {
  register: (request: RegistrationRequest) => Promise<RegistrationResponse>;
  login: (request: LoginRequest) => Promise<AuthResponse>;
  refresh: (refreshToken: string) => Promise<AuthResponse>;
  logout: (refreshToken: string) => Promise<void>;
  getCurrentUser: (accessToken: string) => Promise<AuthUser>;
};

export const authService: AuthService = {
  register(request: RegistrationRequest): Promise<RegistrationResponse> {
    return apiRequest("/auth/register", {
      method: "POST",
      body: request,
      skipRefresh: true,
    });
  },

  login(request: LoginRequest): Promise<AuthResponse> {
    return apiRequest("/auth/login", {
      method: "POST",
      body: request,
      skipRefresh: true,
    });
  },

  refresh(refreshToken: string): Promise<AuthResponse> {
    const request: RefreshRequest = { refreshToken };
    return apiRequest("/auth/refresh", {
      method: "POST",
      body: request,
      skipRefresh: true,
    });
  },

  logout(refreshToken: string): Promise<void> {
    return apiRequest("/auth/logout", {
      method: "POST",
      body: { refreshToken },
      signal: AbortSignal.timeout(5_000),
      skipRefresh: true,
    });
  },

  getCurrentUser(accessToken: string): Promise<AuthUser> {
    return apiRequest("/auth/me", {
      method: "GET",
      accessToken,
      authenticated: true,
    });
  },
};

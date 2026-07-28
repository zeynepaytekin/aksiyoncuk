import { apiRequest } from "@/services/api/apiClient";
import type {
  FollowResponse,
  NetworkPage,
  NetworkPaginationParams,
  NetworkSummary,
} from "@/types/network";

export function normalizeNetworkUsername(username: string): string {
  return username.trim().toLowerCase();
}

function path(username: string): string {
  return encodeURIComponent(normalizeNetworkUsername(username));
}

function query(params?: NetworkPaginationParams): string {
  const search = new URLSearchParams();
  if (params?.page !== undefined) search.set("page", String(params.page));
  if (params?.size !== undefined) search.set("size", String(params.size));
  const value = search.toString();
  return value ? `?${value}` : "";
}

export const networkService = {
  follow(username: string): Promise<FollowResponse> {
    return apiRequest(`/users/${path(username)}/follow`, {
      method: "PUT",
      authenticated: true,
    });
  },
  unfollow(username: string): Promise<FollowResponse> {
    return apiRequest(`/users/${path(username)}/follow`, {
      method: "DELETE",
      authenticated: true,
    });
  },
  getFollowers(
    username: string,
    params?: NetworkPaginationParams,
  ): Promise<NetworkPage> {
    return apiRequest(`/users/${path(username)}/followers${query(params)}`, {
      authenticated: true,
    });
  },
  getFollowing(
    username: string,
    params?: NetworkPaginationParams,
  ): Promise<NetworkPage> {
    return apiRequest(`/users/${path(username)}/following${query(params)}`, {
      authenticated: true,
    });
  },
  getMySummary(): Promise<NetworkSummary> {
    return apiRequest("/network/me", { authenticated: true });
  },
};

export type NetworkService = typeof networkService;

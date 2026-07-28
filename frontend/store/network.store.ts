"use client";

import { create } from "zustand";
import { ApiError } from "@/services/api/apiClient";
import { networkService, normalizeNetworkUsername } from "@/services/api/network.service";
import { networkStateCoordinator } from "@/services/network/networkStateCoordinator";
import { profileNetworkCoordinator } from "@/services/network/profileNetworkCoordinator";
import type {
  FollowResponse,
  NetworkPage,
  NetworkPageMetadata,
  NetworkPaginationParams,
  NetworkSummary,
  NetworkUser,
} from "@/types/network";

export type NetworkStatus = "idle" | "loading" | "loaded" | "error";

type State = {
  summary: NetworkSummary | null;
  summaryStatus: NetworkStatus;
  summaryError: ApiError | null;
  followersByUsername: Record<string, NetworkUser[]>;
  followerPageMetadataByUsername: Record<string, NetworkPageMetadata | null>;
  followerStatusByUsername: Record<string, NetworkStatus>;
  followerErrorByUsername: Record<string, ApiError | null>;
  followingByUsername: Record<string, NetworkUser[]>;
  followingPageMetadataByUsername: Record<string, NetworkPageMetadata | null>;
  followingStatusByUsername: Record<string, NetworkStatus>;
  followingErrorByUsername: Record<string, ApiError | null>;
  followStatusByUsername: Record<string, NetworkStatus>;
  followErrorByUsername: Record<string, ApiError | null>;
  loadMySummary: () => Promise<void>;
  loadFollowers: (username: string, params?: NetworkPaginationParams) => Promise<void>;
  loadFollowing: (username: string, params?: NetworkPaginationParams) => Promise<void>;
  followUser: (username: string) => Promise<FollowResponse>;
  unfollowUser: (username: string) => Promise<FollowResponse>;
  toggleFollow: (username: string) => Promise<FollowResponse>;
  clearPrivateNetwork: () => void;
  clearPublicNetwork: (username?: string) => void;
  clearErrors: (username?: string) => void;
};

let summaryRequest: Promise<void> | null = null;
const followerRequests = new Map<string, Promise<void>>();
const followingRequests = new Map<string, Promise<void>>();

const errorOf = (error: unknown, fallback: string) =>
  error instanceof ApiError ? error : new ApiError(0, "NETWORK_ERROR", fallback);
const metadata = (page: NetworkPage): NetworkPageMetadata => ({
  page: page.page, size: page.size, totalElements: page.totalElements,
  totalPages: page.totalPages, first: page.first, last: page.last,
});
const updateUsers = (
  values: Record<string, NetworkUser[]>,
  username: string,
  followed: boolean,
) => Object.fromEntries(Object.entries(values).map(([key, users]) => [
  key,
  users.map((user) => user.username.toLowerCase() === username
    ? { ...user, followedByCurrentUser: followed } : user),
]));

export const useNetworkStore = create<State>()((set, get) => ({
  summary: null, summaryStatus: "idle", summaryError: null,
  followersByUsername: {}, followerPageMetadataByUsername: {},
  followerStatusByUsername: {}, followerErrorByUsername: {},
  followingByUsername: {}, followingPageMetadataByUsername: {},
  followingStatusByUsername: {}, followingErrorByUsername: {},
  followStatusByUsername: {}, followErrorByUsername: {},

  loadMySummary() {
    if (summaryRequest) return summaryRequest;
    summaryRequest = (async () => {
      set({ summaryStatus: "loading", summaryError: null });
      try {
        set({ summary: await networkService.getMySummary(), summaryStatus: "loaded" });
      } catch (error) {
        const mapped = errorOf(error, "Network summary could not be loaded.");
        set({ summaryStatus: "error", summaryError: mapped });
        throw mapped;
      } finally {
        summaryRequest = null;
      }
    })();
    return summaryRequest;
  },

  loadFollowers(username, params) {
    return loadList("followers", username, params, set, followerRequests);
  },
  loadFollowing(username, params) {
    return loadList("following", username, params, set, followingRequests);
  },
  followUser(username) {
    return mutate(username, true, set, get);
  },
  unfollowUser(username) {
    return mutate(username, false, set, get);
  },
  toggleFollow(username) {
    const key = normalizeNetworkUsername(username);
    const profile = profileNetworkCoordinator.read(key);
    const listed = [
      ...Object.values(get().followersByUsername).flat(),
      ...Object.values(get().followingByUsername).flat(),
    ].find((user) => user.username.toLowerCase() === key);
    return mutate(key, !(profile?.followedByCurrentUser ?? listed?.followedByCurrentUser ?? false), set, get);
  },
  clearPrivateNetwork() {
    summaryRequest = null;
    set({
      summary: null, summaryStatus: "idle", summaryError: null,
      followStatusByUsername: {}, followErrorByUsername: {},
    });
  },
  clearPublicNetwork(username) {
    if (!username) {
      followerRequests.clear();
      followingRequests.clear();
      set({
        followersByUsername: {}, followerPageMetadataByUsername: {},
        followerStatusByUsername: {}, followerErrorByUsername: {},
        followingByUsername: {}, followingPageMetadataByUsername: {},
        followingStatusByUsername: {}, followingErrorByUsername: {},
      });
      return;
    }
    const key = normalizeNetworkUsername(username);
    set((state) => {
      const followers = { ...state.followersByUsername }; delete followers[key];
      const following = { ...state.followingByUsername }; delete following[key];
      return { followersByUsername: followers, followingByUsername: following };
    });
  },
  clearErrors(username) {
    if (!username) {
      set({
        summaryError: null, followerErrorByUsername: {},
        followingErrorByUsername: {}, followErrorByUsername: {},
      });
      return;
    }
    const key = normalizeNetworkUsername(username);
    set((state) => ({
      followErrorByUsername: { ...state.followErrorByUsername, [key]: null },
      followerErrorByUsername: { ...state.followerErrorByUsername, [key]: null },
      followingErrorByUsername: { ...state.followingErrorByUsername, [key]: null },
    }));
  },
}));

type Setter = (
  partial: Partial<State> | ((state: State) => Partial<State>),
) => void;

function loadList(
  kind: "followers" | "following",
  username: string,
  params: NetworkPaginationParams | undefined,
  set: Setter,
  requests: Map<string, Promise<void>>,
): Promise<void> {
  const normalized = normalizeNetworkUsername(username);
  const key = `${normalized}:${params?.page ?? 0}:${params?.size ?? 20}`;
  const existing = requests.get(key);
  if (existing) return existing;
  const request = (async () => {
    const statusKey = kind === "followers" ? "followerStatusByUsername" : "followingStatusByUsername";
    const errorKey = kind === "followers" ? "followerErrorByUsername" : "followingErrorByUsername";
    set((state) => ({
      [statusKey]: { ...state[statusKey], [normalized]: "loading" },
      [errorKey]: { ...state[errorKey], [normalized]: null },
    }));
    try {
      const page = kind === "followers"
        ? await networkService.getFollowers(normalized, params)
        : await networkService.getFollowing(normalized, params);
      set((state) => kind === "followers" ? {
        followersByUsername: { ...state.followersByUsername, [normalized]: page.content },
        followerPageMetadataByUsername: {
          ...state.followerPageMetadataByUsername, [normalized]: metadata(page),
        },
        followerStatusByUsername: { ...state.followerStatusByUsername, [normalized]: "loaded" },
      } : {
        followingByUsername: { ...state.followingByUsername, [normalized]: page.content },
        followingPageMetadataByUsername: {
          ...state.followingPageMetadataByUsername, [normalized]: metadata(page),
        },
        followingStatusByUsername: { ...state.followingStatusByUsername, [normalized]: "loaded" },
      });
    } catch (error) {
      const mapped = errorOf(error, `Unable to load ${kind}.`);
      set((state) => ({
        [statusKey]: { ...state[statusKey], [normalized]: "error" },
        [errorKey]: { ...state[errorKey], [normalized]: mapped },
      }));
      throw mapped;
    } finally {
      requests.delete(key);
    }
  })();
  requests.set(key, request);
  return request;
}

async function mutate(
  username: string,
  follow: boolean,
  set: Setter,
  get: () => State,
): Promise<FollowResponse> {
  const key = normalizeNetworkUsername(username);
  if (get().followStatusByUsername[key] === "loading") {
    throw new ApiError(409, "FOLLOW_PENDING", "Follow change pending.");
  }
  const previousProfile = profileNetworkCoordinator.read(key);
  const previousFollowers = get().followersByUsername;
  const previousFollowing = get().followingByUsername;
  const previousSummary = get().summary;
  const listed = [...Object.values(previousFollowers).flat(), ...Object.values(previousFollowing).flat()]
    .find((user) => user.username.toLowerCase() === key);
  const previousFollowed = previousProfile?.followedByCurrentUser
    ?? listed?.followedByCurrentUser ?? !follow;
  const previousCount = previousProfile?.followerCount ?? 0;
  const delta = follow ? 1 : -1;

  profileNetworkCoordinator.optimistic(
    key, follow, Math.max(0, previousCount + delta),
  );
  set((state) => ({
    followersByUsername: updateUsers(state.followersByUsername, key, follow),
    followingByUsername: updateUsers(state.followingByUsername, key, follow),
    summary: state.summary
      ? { ...state.summary, followingCount: Math.max(0, state.summary.followingCount + delta) }
      : state.summary,
    followStatusByUsername: { ...state.followStatusByUsername, [key]: "loading" },
    followErrorByUsername: { ...state.followErrorByUsername, [key]: null },
  }));
  try {
    const response = follow
      ? await networkService.follow(key)
      : await networkService.unfollow(key);
    profileNetworkCoordinator.settle(response);
    set((state) => ({
      followersByUsername: updateUsers(
        state.followersByUsername, key, response.followedByCurrentUser,
      ),
      followingByUsername: updateUsers(
        state.followingByUsername, key, response.followedByCurrentUser,
      ),
      followStatusByUsername: { ...state.followStatusByUsername, [key]: "loaded" },
    }));
    return response;
  } catch (error) {
    const mapped = errorOf(error, "Follow state could not be changed.");
    profileNetworkCoordinator.restore(key, previousProfile);
    set((state) => ({
      followersByUsername: previousFollowers,
      followingByUsername: previousFollowing,
      summary: previousSummary,
      followStatusByUsername: { ...state.followStatusByUsername, [key]: "error" },
      followErrorByUsername: { ...state.followErrorByUsername, [key]: mapped },
    }));
    void previousFollowed;
    throw mapped;
  }
}

networkStateCoordinator.configure((authenticated) => {
  const state = useNetworkStore.getState();
  state.clearPrivateNetwork();
  if (authenticated) {
    profileNetworkCoordinator.invalidatePublic();
  } else {
    profileNetworkCoordinator.normalizeViewerState();
  }
  useNetworkStore.setState((current) => ({
    followersByUsername: updateAllViewerFlags(current.followersByUsername, false),
    followingByUsername: updateAllViewerFlags(current.followingByUsername, false),
  }));
  if (authenticated) {
    state.clearPublicNetwork();
  }
});

function updateAllViewerFlags(
  values: Record<string, NetworkUser[]>,
  followed: boolean,
): Record<string, NetworkUser[]> {
  return Object.fromEntries(Object.entries(values).map(([key, users]) => [
    key, users.map((user) => ({ ...user, followedByCurrentUser: followed })),
  ]));
}

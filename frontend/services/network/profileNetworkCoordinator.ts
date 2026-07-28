import type { FollowResponse } from "@/types/network";
import type { PublicProfile } from "@/types/profile";

type Handler = {
  read: (username: string) => PublicProfile | null;
  optimistic: (
    username: string,
    followed: boolean,
    followerCount: number,
  ) => void;
  settle: (response: FollowResponse) => void;
  restore: (username: string, profile: PublicProfile | null) => void;
  normalizeViewerState: () => void;
  invalidatePublic: () => void;
};

let handler: Handler = {
  read: () => null,
  optimistic: () => undefined,
  settle: () => undefined,
  restore: () => undefined,
  normalizeViewerState: () => undefined,
  invalidatePublic: () => undefined,
};

export const profileNetworkCoordinator = {
  configure(next: Handler): void {
    handler = next;
  },
  read(username: string): PublicProfile | null {
    return handler.read(username);
  },
  optimistic(username: string, followed: boolean, followerCount: number): void {
    handler.optimistic(username, followed, followerCount);
  },
  settle(response: FollowResponse): void {
    handler.settle(response);
  },
  restore(username: string, profile: PublicProfile | null): void {
    handler.restore(username, profile);
  },
  normalizeViewerState(): void {
    handler.normalizeViewerState();
  },
  invalidatePublic(): void {
    handler.invalidatePublic();
  },
};

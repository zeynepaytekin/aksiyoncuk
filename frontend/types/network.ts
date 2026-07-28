export type FollowResponse = {
  userId: string;
  username: string;
  followedByCurrentUser: boolean;
  followerCount: number;
  followingCount: number;
};

export type NetworkUser = {
  id: string;
  username: string;
  fullName: string;
  professionalTitle: string | null;
  followedByCurrentUser: boolean;
};

export type NetworkPage = {
  content: NetworkUser[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
};

export type NetworkSummary = {
  followerCount: number;
  followingCount: number;
  mutualCount: number;
};

export type NetworkPaginationParams = {
  page?: number;
  size?: number;
};

export type NetworkPageMetadata = Omit<NetworkPage, "content">;

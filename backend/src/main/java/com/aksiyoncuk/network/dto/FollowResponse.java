package com.aksiyoncuk.network.dto;

import java.util.UUID;

public record FollowResponse(
    UUID userId,
    String username,
    boolean followedByCurrentUser,
    long followerCount,
    long followingCount) {}

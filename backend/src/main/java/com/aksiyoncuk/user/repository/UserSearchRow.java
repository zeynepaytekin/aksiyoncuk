package com.aksiyoncuk.user.repository;

import java.util.UUID;

public record UserSearchRow(
    UUID id,
    String username,
    String fullName,
    String professionalTitle,
    String location,
    long followerCount,
    long followingCount,
    boolean followedByCurrentUser) {}

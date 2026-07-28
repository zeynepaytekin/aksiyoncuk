package com.aksiyoncuk.search.dto;

import com.aksiyoncuk.user.repository.UserSearchRow;
import java.util.UUID;

public record SearchUserResponse(
    UUID id,
    String username,
    String fullName,
    String professionalTitle,
    String location,
    long followerCount,
    long followingCount,
    boolean followedByCurrentUser) {

  public static SearchUserResponse from(UserSearchRow row) {
    return new SearchUserResponse(
        row.id(),
        row.username(),
        row.fullName(),
        row.professionalTitle(),
        row.location(),
        row.followerCount(),
        row.followingCount(),
        row.followedByCurrentUser());
  }
}

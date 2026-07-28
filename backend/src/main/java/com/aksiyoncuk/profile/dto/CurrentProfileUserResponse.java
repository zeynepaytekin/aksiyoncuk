package com.aksiyoncuk.profile.dto;

import com.aksiyoncuk.user.entity.User;
import com.aksiyoncuk.user.entity.UserStatus;
import java.time.Instant;
import java.util.UUID;

public record CurrentProfileUserResponse(
    UUID id, String email, String username, String fullName, UserStatus status, Instant createdAt) {

  public static CurrentProfileUserResponse from(User user) {
    return new CurrentProfileUserResponse(
        user.getId(),
        user.getEmail(),
        user.getUsername(),
        user.getFullName(),
        user.getStatus(),
        user.getCreatedAt());
  }
}

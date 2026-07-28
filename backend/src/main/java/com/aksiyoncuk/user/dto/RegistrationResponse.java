package com.aksiyoncuk.user.dto;

import com.aksiyoncuk.user.entity.User;
import com.aksiyoncuk.user.entity.UserStatus;
import java.time.Instant;
import java.util.UUID;

public record RegistrationResponse(
    UUID id,
    String email,
    String username,
    String fullName,
    UserStatus status,
    Instant createdAt,
    ProfileResponse profile) {

  public static RegistrationResponse from(User user) {
    return new RegistrationResponse(
        user.getId(),
        user.getEmail(),
        user.getUsername(),
        user.getFullName(),
        user.getStatus(),
        user.getCreatedAt(),
        ProfileResponse.empty());
  }
}

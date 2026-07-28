package com.aksiyoncuk.auth.dto;

import com.aksiyoncuk.user.entity.User;
import com.aksiyoncuk.user.entity.UserStatus;
import java.util.UUID;

public record AuthUserResponse(
    UUID id, String email, String username, String fullName, UserStatus status) {

  public static AuthUserResponse from(User user) {
    return new AuthUserResponse(
        user.getId(), user.getEmail(), user.getUsername(), user.getFullName(), user.getStatus());
  }
}

package com.aksiyoncuk.profile.dto;

import com.aksiyoncuk.profile.entity.Profile;
import com.aksiyoncuk.user.entity.UserStatus;
import java.time.Instant;
import java.util.UUID;

public record PublicProfileResponse(
    UUID id,
    UUID userId,
    String username,
    String fullName,
    UserStatus status,
    String professionalTitle,
    String bio,
    String location,
    String websiteUrl,
    Instant createdAt,
    Instant updatedAt) {

  public static PublicProfileResponse from(Profile profile) {
    var user = profile.getUser();
    return new PublicProfileResponse(
        profile.getId(),
        user.getId(),
        user.getUsername(),
        user.getFullName(),
        user.getStatus(),
        profile.getProfessionalTitle(),
        profile.getBio(),
        profile.getLocation(),
        profile.getWebsiteUrl(),
        profile.getCreatedAt(),
        profile.getUpdatedAt());
  }
}

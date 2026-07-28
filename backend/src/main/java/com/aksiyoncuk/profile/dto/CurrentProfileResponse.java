package com.aksiyoncuk.profile.dto;

import com.aksiyoncuk.profile.entity.Profile;
import java.time.Instant;
import java.util.UUID;

public record CurrentProfileResponse(
    UUID id,
    CurrentProfileUserResponse user,
    String professionalTitle,
    String bio,
    String location,
    String websiteUrl,
    Instant createdAt,
    Instant updatedAt) {

  public static CurrentProfileResponse from(Profile profile) {
    return new CurrentProfileResponse(
        profile.getId(),
        CurrentProfileUserResponse.from(profile.getUser()),
        profile.getProfessionalTitle(),
        profile.getBio(),
        profile.getLocation(),
        profile.getWebsiteUrl(),
        profile.getCreatedAt(),
        profile.getUpdatedAt());
  }
}

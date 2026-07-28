package com.aksiyoncuk.user.dto;

public record ProfileResponse(
    String professionalTitle, String bio, String location, String websiteUrl) {

  public static ProfileResponse empty() {
    return new ProfileResponse(null, null, null, null);
  }
}

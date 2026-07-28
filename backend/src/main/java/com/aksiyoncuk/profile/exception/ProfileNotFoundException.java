package com.aksiyoncuk.profile.exception;

import org.springframework.http.HttpStatus;

public final class ProfileNotFoundException extends ProfileException {

  public ProfileNotFoundException() {
    super("PROFILE_NOT_FOUND", "Profile was not found", HttpStatus.NOT_FOUND);
  }
}

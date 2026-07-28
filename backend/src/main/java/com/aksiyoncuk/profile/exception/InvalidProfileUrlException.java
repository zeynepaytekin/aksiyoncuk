package com.aksiyoncuk.profile.exception;

import org.springframework.http.HttpStatus;

public final class InvalidProfileUrlException extends ProfileException {

  public InvalidProfileUrlException() {
    super(
        "INVALID_PROFILE_URL",
        "Website URL must be an absolute HTTP or HTTPS URL",
        HttpStatus.BAD_REQUEST);
  }
}

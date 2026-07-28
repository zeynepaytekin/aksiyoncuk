package com.aksiyoncuk.profile.exception;

import org.springframework.http.HttpStatus;

public final class InvalidProfileUpdateException extends ProfileException {

  public InvalidProfileUpdateException(String message) {
    super("INVALID_PROFILE_UPDATE", message, HttpStatus.BAD_REQUEST);
  }
}

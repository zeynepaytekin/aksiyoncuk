package com.aksiyoncuk.network.exception;

import org.springframework.http.HttpStatus;

public final class SelfFollowNotAllowedException extends NetworkException {
  public SelfFollowNotAllowedException() {
    super(HttpStatus.BAD_REQUEST, "SELF_FOLLOW_NOT_ALLOWED", "Users cannot follow themselves");
  }
}

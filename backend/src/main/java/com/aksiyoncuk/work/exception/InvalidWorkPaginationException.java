package com.aksiyoncuk.work.exception;

import org.springframework.http.HttpStatus;

public final class InvalidWorkPaginationException extends WorkException {
  public InvalidWorkPaginationException() {
    super(
        "INVALID_PAGINATION",
        "Page must be at least 0 and size must be between 1 and 50",
        HttpStatus.BAD_REQUEST);
  }
}

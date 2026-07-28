package com.aksiyoncuk.post.exception;

import org.springframework.http.HttpStatus;

public final class InvalidPaginationException extends PostException {
  public InvalidPaginationException() {
    super(
        "INVALID_PAGINATION",
        "Page must be at least 0 and size must be between 1 and 50",
        HttpStatus.BAD_REQUEST);
  }
}

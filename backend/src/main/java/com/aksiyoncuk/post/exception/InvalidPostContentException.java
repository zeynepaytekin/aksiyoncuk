package com.aksiyoncuk.post.exception;

import org.springframework.http.HttpStatus;

public final class InvalidPostContentException extends PostException {
  public InvalidPostContentException(String message) {
    super("INVALID_POST_CONTENT", message, HttpStatus.BAD_REQUEST);
  }
}

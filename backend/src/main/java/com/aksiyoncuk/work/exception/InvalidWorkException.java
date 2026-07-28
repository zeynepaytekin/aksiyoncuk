package com.aksiyoncuk.work.exception;

import org.springframework.http.HttpStatus;

public final class InvalidWorkException extends WorkException {
  public InvalidWorkException(String code, String message) {
    super(code, message, HttpStatus.BAD_REQUEST);
  }
}

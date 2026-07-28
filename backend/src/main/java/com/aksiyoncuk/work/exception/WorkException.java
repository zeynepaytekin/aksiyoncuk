package com.aksiyoncuk.work.exception;

import org.springframework.http.HttpStatus;

public abstract class WorkException extends RuntimeException {

  private final String code;
  private final HttpStatus status;

  protected WorkException(String code, String message, HttpStatus status) {
    super(message);
    this.code = code;
    this.status = status;
  }

  public String getCode() {
    return code;
  }

  public HttpStatus getStatus() {
    return status;
  }
}

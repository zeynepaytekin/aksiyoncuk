package com.aksiyoncuk.post.exception;

import org.springframework.http.HttpStatus;

public abstract class PostException extends RuntimeException {

  private final String code;
  private final HttpStatus status;

  protected PostException(String code, String message, HttpStatus status) {
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

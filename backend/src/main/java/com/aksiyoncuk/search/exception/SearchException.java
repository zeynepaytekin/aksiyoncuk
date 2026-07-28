package com.aksiyoncuk.search.exception;

import org.springframework.http.HttpStatus;

public class SearchException extends RuntimeException {

  private final String code;
  private final HttpStatus status;

  public SearchException(String code, String message) {
    super(message);
    this.code = code;
    this.status = HttpStatus.BAD_REQUEST;
  }

  public String getCode() {
    return code;
  }

  public HttpStatus getStatus() {
    return status;
  }
}

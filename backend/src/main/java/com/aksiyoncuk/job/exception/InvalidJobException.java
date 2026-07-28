package com.aksiyoncuk.job.exception;

import org.springframework.http.HttpStatus;

public class InvalidJobException extends JobException {
  public InvalidJobException(String code, String message) {
    super(code, message, HttpStatus.BAD_REQUEST);
  }
}

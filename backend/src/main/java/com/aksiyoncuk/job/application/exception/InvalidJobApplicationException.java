package com.aksiyoncuk.job.application.exception;

import org.springframework.http.HttpStatus;

public class InvalidJobApplicationException extends JobApplicationException {
  public InvalidJobApplicationException(String code, String message) {
    super(code, message, HttpStatus.BAD_REQUEST);
  }
}

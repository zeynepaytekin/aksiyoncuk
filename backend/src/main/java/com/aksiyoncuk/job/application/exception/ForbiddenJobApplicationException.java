package com.aksiyoncuk.job.application.exception;

import org.springframework.http.HttpStatus;

public class ForbiddenJobApplicationException extends JobApplicationException {
  public ForbiddenJobApplicationException(String code, String message) {
    super(code, message, HttpStatus.FORBIDDEN);
  }
}

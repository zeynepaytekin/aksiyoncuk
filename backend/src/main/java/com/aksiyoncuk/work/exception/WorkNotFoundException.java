package com.aksiyoncuk.work.exception;

import org.springframework.http.HttpStatus;

public final class WorkNotFoundException extends WorkException {
  public WorkNotFoundException() {
    super("WORK_NOT_FOUND", "Work was not found", HttpStatus.NOT_FOUND);
  }
}

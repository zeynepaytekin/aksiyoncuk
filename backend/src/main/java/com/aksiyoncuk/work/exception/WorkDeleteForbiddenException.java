package com.aksiyoncuk.work.exception;

import org.springframework.http.HttpStatus;

public final class WorkDeleteForbiddenException extends WorkException {
  public WorkDeleteForbiddenException() {
    super(
        "WORK_DELETE_FORBIDDEN", "Only the work owner may delete this work", HttpStatus.FORBIDDEN);
  }
}

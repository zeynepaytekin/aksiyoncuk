package com.aksiyoncuk.work.exception;

import org.springframework.http.HttpStatus;

public final class WorkUpdateForbiddenException extends WorkException {
  public WorkUpdateForbiddenException() {
    super(
        "WORK_UPDATE_FORBIDDEN", "Only the work owner may update this work", HttpStatus.FORBIDDEN);
  }
}

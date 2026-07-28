package com.aksiyoncuk.job.exception;

import org.springframework.http.HttpStatus;

public class JobUpdateForbiddenException extends JobException {
  public JobUpdateForbiddenException() {
    super("JOB_UPDATE_FORBIDDEN", "Only the job owner may update this job", HttpStatus.FORBIDDEN);
  }
}

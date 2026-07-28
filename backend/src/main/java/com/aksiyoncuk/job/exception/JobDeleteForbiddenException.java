package com.aksiyoncuk.job.exception;

import org.springframework.http.HttpStatus;

public class JobDeleteForbiddenException extends JobException {
  public JobDeleteForbiddenException() {
    super("JOB_DELETE_FORBIDDEN", "Only the job owner may delete this job", HttpStatus.FORBIDDEN);
  }
}

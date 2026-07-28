package com.aksiyoncuk.job.application.exception;

import org.springframework.http.HttpStatus;

public class JobApplicationConflictException extends JobApplicationException {
  public JobApplicationConflictException() {
    super(
        "JOB_APPLICATION_ALREADY_EXISTS",
        "An application already exists for this job",
        HttpStatus.CONFLICT);
  }
}

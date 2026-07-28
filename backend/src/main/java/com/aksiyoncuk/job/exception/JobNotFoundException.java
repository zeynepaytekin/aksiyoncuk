package com.aksiyoncuk.job.exception;

import org.springframework.http.HttpStatus;

public class JobNotFoundException extends JobException {
  public JobNotFoundException() {
    super("JOB_NOT_FOUND", "Job was not found", HttpStatus.NOT_FOUND);
  }
}

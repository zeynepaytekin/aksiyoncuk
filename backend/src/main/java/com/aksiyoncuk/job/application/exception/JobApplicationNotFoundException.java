package com.aksiyoncuk.job.application.exception;

import org.springframework.http.HttpStatus;

public class JobApplicationNotFoundException extends JobApplicationException {
  public JobApplicationNotFoundException() {
    super("JOB_APPLICATION_NOT_FOUND", "Job application was not found", HttpStatus.NOT_FOUND);
  }
}

package com.aksiyoncuk.job.exception;

public class InvalidJobPaginationException extends InvalidJobException {
  public InvalidJobPaginationException() {
    super("INVALID_PAGINATION", "Page must be at least 0 and size must be between 1 and 50");
  }
}

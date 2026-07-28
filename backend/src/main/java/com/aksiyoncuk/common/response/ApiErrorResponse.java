package com.aksiyoncuk.common.response;

import java.time.Instant;
import java.util.List;

public record ApiErrorResponse(
    Instant timestamp,
    int status,
    String error,
    String code,
    String message,
    String path,
    List<FieldValidationError> validationErrors) {

  public static ApiErrorResponse of(
      int status,
      String error,
      String code,
      String message,
      String path,
      List<FieldValidationError> validationErrors) {
    return new ApiErrorResponse(
        Instant.now(), status, error, code, message, path, List.copyOf(validationErrors));
  }
}

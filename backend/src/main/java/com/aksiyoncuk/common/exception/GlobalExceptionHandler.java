package com.aksiyoncuk.common.exception;

import com.aksiyoncuk.auth.exception.AuthException;
import com.aksiyoncuk.common.response.ApiErrorResponse;
import com.aksiyoncuk.common.response.FieldValidationError;
import com.aksiyoncuk.post.comment.exception.CommentException;
import com.aksiyoncuk.post.exception.PostException;
import com.aksiyoncuk.profile.exception.ProfileException;
import com.aksiyoncuk.user.exception.RegistrationConflictException;
import com.aksiyoncuk.work.exception.WorkException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import java.util.Comparator;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

@RestControllerAdvice
public class GlobalExceptionHandler {

  private static final Logger LOGGER = LoggerFactory.getLogger(GlobalExceptionHandler.class);

  @ExceptionHandler(MethodArgumentNotValidException.class)
  ResponseEntity<ApiErrorResponse> handleMethodArgumentNotValid(
      MethodArgumentNotValidException exception, HttpServletRequest request) {
    var validationErrors =
        exception.getBindingResult().getFieldErrors().stream()
            .sorted(Comparator.comparing(FieldError::getField))
            .map(
                error ->
                    new FieldValidationError(
                        error.getField(),
                        error.getDefaultMessage() == null
                            ? "Invalid value"
                            : error.getDefaultMessage()))
            .toList();

    return error(
        HttpStatus.BAD_REQUEST,
        "VALIDATION_FAILED",
        "Request validation failed",
        request,
        validationErrors);
  }

  @ExceptionHandler(ConstraintViolationException.class)
  ResponseEntity<ApiErrorResponse> handleConstraintViolation(
      ConstraintViolationException exception, HttpServletRequest request) {
    var validationErrors =
        exception.getConstraintViolations().stream()
            .map(
                violation ->
                    new FieldValidationError(
                        violation.getPropertyPath().toString(), violation.getMessage()))
            .sorted(Comparator.comparing(FieldValidationError::field))
            .toList();

    return error(
        HttpStatus.BAD_REQUEST,
        "CONSTRAINT_VIOLATION",
        "Request validation failed",
        request,
        validationErrors);
  }

  @ExceptionHandler(HttpMessageNotReadableException.class)
  ResponseEntity<ApiErrorResponse> handleUnreadableMessage(
      HttpMessageNotReadableException exception, HttpServletRequest request) {
    return error(
        HttpStatus.BAD_REQUEST,
        "MALFORMED_REQUEST",
        "Request body is missing or malformed",
        request,
        List.of());
  }

  @ExceptionHandler(NoResourceFoundException.class)
  ResponseEntity<ApiErrorResponse> handleNotFound(
      NoResourceFoundException exception, HttpServletRequest request) {
    return error(
        HttpStatus.NOT_FOUND,
        "RESOURCE_NOT_FOUND",
        "The requested resource was not found",
        request,
        List.of());
  }

  @ExceptionHandler(RegistrationConflictException.class)
  ResponseEntity<ApiErrorResponse> handleRegistrationConflict(
      RegistrationConflictException exception, HttpServletRequest request) {
    return error(
        HttpStatus.CONFLICT, exception.getCode(), exception.getMessage(), request, List.of());
  }

  @ExceptionHandler(AuthException.class)
  ResponseEntity<ApiErrorResponse> handleAuthException(
      AuthException exception, HttpServletRequest request) {
    return error(
        HttpStatus.UNAUTHORIZED, exception.getCode(), exception.getMessage(), request, List.of());
  }

  @ExceptionHandler(ProfileException.class)
  ResponseEntity<ApiErrorResponse> handleProfileException(
      ProfileException exception, HttpServletRequest request) {
    return error(
        exception.getStatus(), exception.getCode(), exception.getMessage(), request, List.of());
  }

  @ExceptionHandler(PostException.class)
  ResponseEntity<ApiErrorResponse> handlePostException(
      PostException exception, HttpServletRequest request) {
    return error(
        exception.getStatus(), exception.getCode(), exception.getMessage(), request, List.of());
  }

  @ExceptionHandler(CommentException.class)
  ResponseEntity<ApiErrorResponse> handleCommentException(
      CommentException exception, HttpServletRequest request) {
    return error(
        exception.getStatus(), exception.getCode(), exception.getMessage(), request, List.of());
  }

  @ExceptionHandler(WorkException.class)
  ResponseEntity<ApiErrorResponse> handleWorkException(
      WorkException exception, HttpServletRequest request) {
    return error(
        exception.getStatus(), exception.getCode(), exception.getMessage(), request, List.of());
  }

  @ExceptionHandler(MethodArgumentTypeMismatchException.class)
  ResponseEntity<ApiErrorResponse> handleTypeMismatch(
      MethodArgumentTypeMismatchException exception, HttpServletRequest request) {
    var pagination = "page".equals(exception.getName()) || "size".equals(exception.getName());
    return error(
        HttpStatus.BAD_REQUEST,
        pagination ? "INVALID_PAGINATION" : "MALFORMED_REQUEST",
        pagination ? "Pagination value is invalid" : "Request parameter is malformed",
        request,
        List.of());
  }

  @ExceptionHandler(Exception.class)
  ResponseEntity<ApiErrorResponse> handleUnexpected(
      Exception exception, HttpServletRequest request) {
    LOGGER.error("Unhandled request failure for path {}", request.getRequestURI(), exception);
    return error(
        HttpStatus.INTERNAL_SERVER_ERROR,
        "INTERNAL_SERVER_ERROR",
        "An unexpected error occurred",
        request,
        List.of());
  }

  private ResponseEntity<ApiErrorResponse> error(
      HttpStatus status,
      String code,
      String message,
      HttpServletRequest request,
      List<FieldValidationError> validationErrors) {
    var body =
        ApiErrorResponse.of(
            status.value(),
            status.getReasonPhrase(),
            code,
            message,
            request.getRequestURI(),
            validationErrors);
    return ResponseEntity.status(status).body(body);
  }
}

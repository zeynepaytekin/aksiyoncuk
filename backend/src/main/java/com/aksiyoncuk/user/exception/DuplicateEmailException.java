package com.aksiyoncuk.user.exception;

public class DuplicateEmailException extends RegistrationConflictException {

  public DuplicateEmailException() {
    super("EMAIL_ALREADY_EXISTS", "An account with this email already exists");
  }
}

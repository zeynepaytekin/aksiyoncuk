package com.aksiyoncuk.user.exception;

public class DuplicateUsernameException extends RegistrationConflictException {

  public DuplicateUsernameException() {
    super("USERNAME_ALREADY_EXISTS", "This username is already in use");
  }
}

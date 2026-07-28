package com.aksiyoncuk.messaging.exception;

import org.springframework.http.HttpStatus;

public class InvalidMessagingRequestException extends MessagingException {
  public InvalidMessagingRequestException(String code, String message) {
    super(HttpStatus.BAD_REQUEST, code, message);
  }
}

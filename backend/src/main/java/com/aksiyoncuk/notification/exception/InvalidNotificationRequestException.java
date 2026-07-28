package com.aksiyoncuk.notification.exception;

import org.springframework.http.HttpStatus;

public final class InvalidNotificationRequestException extends NotificationException {
  public InvalidNotificationRequestException(String code, String message) {
    super(HttpStatus.BAD_REQUEST, code, message);
  }
}

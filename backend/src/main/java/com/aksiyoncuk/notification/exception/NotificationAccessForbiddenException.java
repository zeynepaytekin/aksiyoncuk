package com.aksiyoncuk.notification.exception;

import org.springframework.http.HttpStatus;

public final class NotificationAccessForbiddenException extends NotificationException {
  public NotificationAccessForbiddenException() {
    super(
        HttpStatus.FORBIDDEN,
        "NOTIFICATION_ACCESS_FORBIDDEN",
        "Notification does not belong to the current user");
  }
}

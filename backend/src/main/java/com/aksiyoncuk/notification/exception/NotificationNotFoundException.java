package com.aksiyoncuk.notification.exception;

import org.springframework.http.HttpStatus;

public final class NotificationNotFoundException extends NotificationException {
  public NotificationNotFoundException() {
    super(HttpStatus.NOT_FOUND, "NOTIFICATION_NOT_FOUND", "Notification was not found");
  }
}

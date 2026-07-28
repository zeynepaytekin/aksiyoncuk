package com.aksiyoncuk.messaging.exception;

import org.springframework.http.HttpStatus;

public class ConversationAccessForbiddenException extends MessagingException {
  public ConversationAccessForbiddenException() {
    super(
        HttpStatus.FORBIDDEN,
        "CONVERSATION_ACCESS_FORBIDDEN",
        "You cannot access this conversation");
  }
}

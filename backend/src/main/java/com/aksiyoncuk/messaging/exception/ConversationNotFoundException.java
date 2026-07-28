package com.aksiyoncuk.messaging.exception;

import org.springframework.http.HttpStatus;

public class ConversationNotFoundException extends MessagingException {
  public ConversationNotFoundException() {
    super(HttpStatus.NOT_FOUND, "CONVERSATION_NOT_FOUND", "Conversation was not found");
  }
}

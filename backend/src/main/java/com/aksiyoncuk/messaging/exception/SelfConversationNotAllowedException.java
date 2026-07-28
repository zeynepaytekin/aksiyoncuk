package com.aksiyoncuk.messaging.exception;

import org.springframework.http.HttpStatus;

public class SelfConversationNotAllowedException extends MessagingException {
  public SelfConversationNotAllowedException() {
    super(
        HttpStatus.BAD_REQUEST,
        "SELF_CONVERSATION_NOT_ALLOWED",
        "You cannot start a conversation with yourself");
  }
}

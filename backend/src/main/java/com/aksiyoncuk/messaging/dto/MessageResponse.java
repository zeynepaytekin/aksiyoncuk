package com.aksiyoncuk.messaging.dto;

import com.aksiyoncuk.messaging.repository.MessageRow;
import java.time.Instant;
import java.util.UUID;

public record MessageResponse(
    UUID id,
    UUID conversationId,
    String content,
    Instant createdAt,
    boolean sentByCurrentUser,
    MessageSenderResponse sender) {

  public static MessageResponse from(MessageRow row, UUID currentUserId) {
    var sender =
        row.getSenderId() == null
            ? null
            : new MessageSenderResponse(
                row.getSenderId(),
                row.getSenderUsername(),
                row.getSenderFullName(),
                row.getSenderProfessionalTitle());
    return new MessageResponse(
        row.getId(),
        row.getConversationId(),
        row.getContent(),
        row.getCreatedAt(),
        row.getSenderId() != null && row.getSenderId().equals(currentUserId),
        sender);
  }
}

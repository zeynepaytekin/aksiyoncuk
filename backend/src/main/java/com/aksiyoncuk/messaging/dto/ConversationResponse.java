package com.aksiyoncuk.messaging.dto;

import com.aksiyoncuk.messaging.entity.ConversationType;
import com.aksiyoncuk.messaging.repository.ConversationRow;
import java.time.Instant;
import java.util.UUID;

public record ConversationResponse(
    UUID id,
    ConversationType type,
    ConversationUserResponse otherUser,
    LatestMessageResponse latestMessage,
    long unreadCount,
    Instant createdAt,
    Instant updatedAt) {

  public static ConversationResponse from(ConversationRow row) {
    var other =
        new ConversationUserResponse(
            row.getOtherUserId(),
            row.getOtherUsername(),
            row.getOtherFullName(),
            row.getOtherProfessionalTitle());
    var latest =
        row.getLatestMessageId() == null
            ? null
            : new LatestMessageResponse(
                row.getLatestMessageId(),
                row.getLatestMessageContent(),
                row.getLatestMessageCreatedAt(),
                Boolean.TRUE.equals(row.getLatestSentByCurrentUser()));
    return new ConversationResponse(
        row.getId(),
        ConversationType.valueOf(row.getType()),
        other,
        latest,
        row.getUnreadCount(),
        row.getCreatedAt(),
        row.getUpdatedAt());
  }
}

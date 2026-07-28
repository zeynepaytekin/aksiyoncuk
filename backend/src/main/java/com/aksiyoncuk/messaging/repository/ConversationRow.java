package com.aksiyoncuk.messaging.repository;

import java.time.Instant;
import java.util.UUID;

public interface ConversationRow {
  UUID getId();

  String getType();

  Instant getCreatedAt();

  Instant getUpdatedAt();

  UUID getOtherUserId();

  String getOtherUsername();

  String getOtherFullName();

  String getOtherProfessionalTitle();

  UUID getLatestMessageId();

  String getLatestMessageContent();

  Instant getLatestMessageCreatedAt();

  Boolean getLatestSentByCurrentUser();

  long getUnreadCount();
}

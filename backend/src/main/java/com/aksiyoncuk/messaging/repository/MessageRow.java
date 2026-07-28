package com.aksiyoncuk.messaging.repository;

import java.time.Instant;
import java.util.UUID;

public interface MessageRow {
  UUID getId();

  UUID getConversationId();

  String getContent();

  Instant getCreatedAt();

  UUID getSenderId();

  String getSenderUsername();

  String getSenderFullName();

  String getSenderProfessionalTitle();
}

package com.aksiyoncuk.messaging.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "conversations")
public class Conversation {
  @Id private UUID id;

  @Enumerated(EnumType.STRING)
  @Column(name = "conversation_type", nullable = false, length = 20)
  private ConversationType type;

  @Column(name = "direct_key", length = 100, unique = true)
  private String directKey;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  protected Conversation() {}

  public UUID getId() {
    return id;
  }

  public void touch(Instant now) {
    updatedAt = now;
  }
}

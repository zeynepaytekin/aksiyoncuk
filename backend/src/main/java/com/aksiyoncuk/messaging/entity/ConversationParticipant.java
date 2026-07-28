package com.aksiyoncuk.messaging.entity;

import com.aksiyoncuk.user.entity.User;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "conversation_participants")
public class ConversationParticipant {
  @Id private UUID id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "conversation_id", nullable = false)
  private Conversation conversation;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "user_id", nullable = false)
  private User user;

  @Column(name = "joined_at", nullable = false, updatable = false)
  private Instant joinedAt;

  @Column(name = "last_read_at")
  private Instant lastReadAt;

  protected ConversationParticipant() {}

  public UUID getId() {
    return id;
  }

  public void markRead(Instant now) {
    lastReadAt = now;
  }
}

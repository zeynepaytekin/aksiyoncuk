package com.aksiyoncuk.notification.entity;

import com.aksiyoncuk.user.entity.User;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "notifications")
public class Notification {
  @Id private UUID id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "recipient_id", nullable = false)
  private User recipient;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "actor_id")
  private User actor;

  @Enumerated(EnumType.STRING)
  @Column(name = "notification_type", nullable = false, length = 50)
  private NotificationType type;

  @Enumerated(EnumType.STRING)
  @Column(name = "entity_type", length = 50)
  private NotificationEntityType entityType;

  @Column(name = "entity_id")
  private UUID entityId;

  @Column(name = "event_key", nullable = false, length = 200, unique = true)
  private String eventKey;

  @Column(nullable = false, length = 500)
  private String message;

  @Column(name = "read_at")
  private Instant readAt;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  protected Notification() {}

  public void markRead() {
    if (readAt == null) readAt = Instant.now();
  }

  public void markUnread() {
    readAt = null;
  }

  public UUID getId() {
    return id;
  }

  public User getRecipient() {
    return recipient;
  }

  public Instant getReadAt() {
    return readAt;
  }
}

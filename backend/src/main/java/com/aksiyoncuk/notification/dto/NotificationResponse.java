package com.aksiyoncuk.notification.dto;

import com.aksiyoncuk.notification.entity.NotificationEntityType;
import com.aksiyoncuk.notification.entity.NotificationType;
import com.aksiyoncuk.notification.repository.NotificationRow;
import java.time.Instant;
import java.util.UUID;

public record NotificationResponse(
    UUID id,
    NotificationType type,
    NotificationEntityType entityType,
    UUID entityId,
    String message,
    boolean read,
    Instant readAt,
    Instant createdAt,
    NotificationActorResponse actor) {

  public static NotificationResponse from(NotificationRow row) {
    var actor =
        row.getActorId() == null
            ? null
            : new NotificationActorResponse(
                row.getActorId(),
                row.getActorUsername(),
                row.getActorFullName(),
                row.getActorProfessionalTitle());
    return new NotificationResponse(
        row.getId(),
        row.getType(),
        row.getEntityType(),
        row.getEntityId(),
        row.getMessage(),
        row.getReadAt() != null,
        row.getReadAt(),
        row.getCreatedAt(),
        actor);
  }
}

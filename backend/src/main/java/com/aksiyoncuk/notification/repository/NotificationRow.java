package com.aksiyoncuk.notification.repository;

import com.aksiyoncuk.notification.entity.NotificationEntityType;
import com.aksiyoncuk.notification.entity.NotificationType;
import java.time.Instant;
import java.util.UUID;

public interface NotificationRow {
  UUID getId();

  NotificationType getType();

  NotificationEntityType getEntityType();

  UUID getEntityId();

  String getMessage();

  Instant getReadAt();

  Instant getCreatedAt();

  UUID getActorId();

  String getActorUsername();

  String getActorFullName();

  String getActorProfessionalTitle();
}

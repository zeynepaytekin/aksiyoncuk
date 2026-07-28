package com.aksiyoncuk.notification.repository;

import com.aksiyoncuk.notification.entity.Notification;
import com.aksiyoncuk.notification.entity.NotificationType;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {
  String PROJECTION =
      """
      select n.id as id, n.type as type, n.entityType as entityType,
             n.entityId as entityId, n.message as message, n.readAt as readAt,
             n.createdAt as createdAt, actor.id as actorId,
             actor.username as actorUsername, actor.fullName as actorFullName,
             profile.professionalTitle as actorProfessionalTitle
      from Notification n
      left join n.actor actor
      left join Profile profile on profile.user.id = actor.id
      """;

  @Modifying
  @Query(
      value =
          """
          insert into notifications (
            id, recipient_id, actor_id, notification_type, entity_type,
            entity_id, event_key, message, created_at
          ) values (
            gen_random_uuid(), :recipientId, :actorId, :notificationType,
            :entityType, :entityId, :eventKey, :message, current_timestamp
          ) on conflict (event_key) do nothing
          """,
      nativeQuery = true)
  int insertIfAbsent(
      @Param("recipientId") UUID recipientId,
      @Param("actorId") UUID actorId,
      @Param("notificationType") String notificationType,
      @Param("entityType") String entityType,
      @Param("entityId") UUID entityId,
      @Param("eventKey") String eventKey,
      @Param("message") String message);

  @Query(
      value =
          PROJECTION
              + """
              where n.recipient.id = :recipientId
                and (:unreadOnly = false or n.readAt is null)
                and (:type is null or n.type = :type)
              """,
      countQuery =
          """
          select count(n) from Notification n
          where n.recipient.id = :recipientId
            and (:unreadOnly = false or n.readAt is null)
            and (:type is null or n.type = :type)
          """)
  Page<NotificationRow> findRecipientProjected(
      @Param("recipientId") UUID recipientId,
      @Param("unreadOnly") boolean unreadOnly,
      @Param("type") NotificationType type,
      Pageable pageable);

  @Query(PROJECTION + " where n.id = :id")
  Optional<NotificationRow> findProjectedById(@Param("id") UUID id);

  long countByRecipientIdAndReadAtIsNull(UUID recipientId);

  @Modifying
  @Query(
      """
      update Notification n set n.readAt = :readAt
      where n.recipient.id = :recipientId and n.readAt is null
      """)
  int markAllRead(@Param("recipientId") UUID recipientId, @Param("readAt") Instant readAt);
}

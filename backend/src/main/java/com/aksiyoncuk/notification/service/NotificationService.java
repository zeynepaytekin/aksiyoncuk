package com.aksiyoncuk.notification.service;

import com.aksiyoncuk.auth.security.AuthenticatedUser;
import com.aksiyoncuk.notification.dto.*;
import com.aksiyoncuk.notification.entity.*;
import com.aksiyoncuk.notification.exception.*;
import com.aksiyoncuk.notification.repository.NotificationRepository;
import com.aksiyoncuk.user.entity.User;
import java.time.Instant;
import java.util.Locale;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NotificationService {
  private static final Sort NEWEST = Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"));
  private final NotificationRepository notifications;

  public NotificationService(NotificationRepository notifications) {
    this.notifications = notifications;
  }

  public void userFollowed(User actor, User recipient) {
    create(
        "follow:" + actor.getId() + ":" + recipient.getId(),
        recipient,
        actor,
        NotificationType.USER_FOLLOWED,
        NotificationEntityType.USER,
        actor.getId(),
        actor.getFullName() + " followed you.");
  }

  public void postLiked(User actor, User recipient, UUID postId) {
    create(
        "post-like:" + postId + ":" + actor.getId(),
        recipient,
        actor,
        NotificationType.POST_LIKED,
        NotificationEntityType.POST,
        postId,
        actor.getFullName() + " liked your post.");
  }

  public void postCommented(User actor, User recipient, UUID postId, UUID commentId) {
    create(
        "post-comment:" + commentId,
        recipient,
        actor,
        NotificationType.POST_COMMENTED,
        NotificationEntityType.POST,
        postId,
        actor.getFullName() + " commented on your post.");
  }

  public void jobApplicationReceived(User actor, User recipient, UUID applicationId) {
    create(
        "application-received:" + applicationId,
        recipient,
        actor,
        NotificationType.JOB_APPLICATION_RECEIVED,
        NotificationEntityType.JOB_APPLICATION,
        applicationId,
        actor.getFullName() + " applied to your job.");
  }

  public void jobApplicationReviewed(
      User actor, User recipient, UUID applicationId, boolean accepted) {
    var type =
        accepted
            ? NotificationType.JOB_APPLICATION_ACCEPTED
            : NotificationType.JOB_APPLICATION_REJECTED;
    var action = accepted ? "accepted" : "rejected";
    create(
        "application-" + action + ":" + applicationId,
        recipient,
        actor,
        type,
        NotificationEntityType.JOB_APPLICATION,
        applicationId,
        actor.getFullName() + " " + action + " your job application.");
  }

  @Transactional(readOnly = true)
  public NotificationPageResponse list(
      AuthenticatedUser principal, int page, int size, boolean unreadOnly, String type) {
    validatePagination(page, size);
    var rows =
        notifications.findRecipientProjected(
            principal.userId(), unreadOnly, parseType(type), PageRequest.of(page, size, NEWEST));
    return new NotificationPageResponse(
        rows.getContent().stream().map(NotificationResponse::from).toList(),
        rows.getNumber(),
        rows.getSize(),
        rows.getTotalElements(),
        rows.getTotalPages(),
        rows.isFirst(),
        rows.isLast());
  }

  @Transactional(readOnly = true)
  public NotificationSummaryResponse summary(AuthenticatedUser principal) {
    return new NotificationSummaryResponse(
        notifications.countByRecipientIdAndReadAtIsNull(principal.userId()));
  }

  @Transactional
  public NotificationResponse markRead(UUID id, AuthenticatedUser principal) {
    var notification = owned(id, principal);
    notification.markRead();
    notifications.flush();
    return projected(id);
  }

  @Transactional
  public NotificationResponse markUnread(UUID id, AuthenticatedUser principal) {
    var notification = owned(id, principal);
    notification.markUnread();
    notifications.flush();
    return projected(id);
  }

  @Transactional
  public NotificationSummaryResponse markAllRead(AuthenticatedUser principal) {
    notifications.markAllRead(principal.userId(), Instant.now());
    return new NotificationSummaryResponse(0);
  }

  private void create(
      String eventKey,
      User recipient,
      User actor,
      NotificationType type,
      NotificationEntityType entityType,
      UUID entityId,
      String message) {
    notifications.insertIfAbsent(
        recipient.getId(),
        actor.getId(),
        type.name(),
        entityType.name(),
        entityId,
        eventKey,
        message);
  }

  private Notification owned(UUID id, AuthenticatedUser principal) {
    var notification = notifications.findById(id).orElseThrow(NotificationNotFoundException::new);
    if (!notification.getRecipient().getId().equals(principal.userId())) {
      throw new NotificationAccessForbiddenException();
    }
    return notification;
  }

  private NotificationResponse projected(UUID id) {
    return notifications
        .findProjectedById(id)
        .map(NotificationResponse::from)
        .orElseThrow(NotificationNotFoundException::new);
  }

  private NotificationType parseType(String value) {
    if (value == null || value.isBlank()) return null;
    try {
      return NotificationType.valueOf(value.trim().toUpperCase(Locale.ROOT));
    } catch (IllegalArgumentException exception) {
      throw new InvalidNotificationRequestException(
          "INVALID_NOTIFICATION_TYPE", "Notification type is unsupported");
    }
  }

  private void validatePagination(int page, int size) {
    if (page < 0 || size < 1 || size > 50) {
      throw new InvalidNotificationRequestException(
          "INVALID_NOTIFICATION_PAGINATION",
          "Page must be at least 0 and size must be between 1 and 50");
    }
  }
}

package com.aksiyoncuk.notification.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.aksiyoncuk.auth.security.AuthenticatedUser;
import com.aksiyoncuk.notification.entity.Notification;
import com.aksiyoncuk.notification.entity.NotificationEntityType;
import com.aksiyoncuk.notification.entity.NotificationType;
import com.aksiyoncuk.notification.exception.InvalidNotificationRequestException;
import com.aksiyoncuk.notification.exception.NotificationAccessForbiddenException;
import com.aksiyoncuk.notification.repository.NotificationRepository;
import com.aksiyoncuk.notification.repository.NotificationRow;
import com.aksiyoncuk.user.entity.User;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {
  @Mock private NotificationRepository repository;
  @Mock private Notification notification;
  @Mock private NotificationRow row;
  @Mock private User actor;
  @Mock private User recipient;

  private NotificationService service;
  private UUID currentUserId;
  private AuthenticatedUser principal;

  @BeforeEach
  void setUp() {
    service = new NotificationService(repository);
    currentUserId = UUID.randomUUID();
    principal = new AuthenticatedUser(currentUserId);
  }

  @Test
  void createsStableDeduplicatedEventKeys() {
    var actorId = UUID.randomUUID();
    var recipientId = UUID.randomUUID();
    var postId = UUID.randomUUID();
    when(actor.getId()).thenReturn(actorId);
    when(actor.getFullName()).thenReturn("Creative User");
    when(recipient.getId()).thenReturn(recipientId);

    service.userFollowed(actor, recipient);
    service.postLiked(actor, recipient, postId);

    verify(repository)
        .insertIfAbsent(
            recipientId,
            actorId,
            "USER_FOLLOWED",
            "USER",
            actorId,
            "follow:" + actorId + ":" + recipientId,
            "Creative User followed you.");
    verify(repository)
        .insertIfAbsent(
            recipientId,
            actorId,
            "POST_LIKED",
            "POST",
            postId,
            "post-like:" + postId + ":" + actorId,
            "Creative User liked your post.");
  }

  @Test
  void listsWithUnreadAndTypeFiltersAndValidatesPagination() {
    when(repository.findRecipientProjected(
            eq(currentUserId), eq(true), eq(NotificationType.POST_LIKED), any(PageRequest.class)))
        .thenReturn(new PageImpl<>(List.of(row), PageRequest.of(0, 20), 1));
    stubRow();

    var result = service.list(principal, 0, 20, true, " post_liked ");

    assertThat(result.totalElements()).isEqualTo(1);
    assertThat(result.content()).hasSize(1);
    assertThat(result.content().getFirst().read()).isFalse();
    assertThat(result.content().getFirst().actor()).isNull();
    assertThatThrownBy(() -> service.list(principal, -1, 20, false, null))
        .isInstanceOf(InvalidNotificationRequestException.class);
    assertThatThrownBy(() -> service.list(principal, 0, 20, false, "unknown"))
        .isInstanceOf(InvalidNotificationRequestException.class);
  }

  @Test
  void summaryAndBulkReadUseAggregateQueries() {
    when(repository.countByRecipientIdAndReadAtIsNull(currentUserId)).thenReturn(8L);

    assertThat(service.summary(principal).unreadCount()).isEqualTo(8);
    assertThat(service.markAllRead(principal).unreadCount()).isZero();
    verify(repository).markAllRead(eq(currentUserId), any(Instant.class));
  }

  @Test
  void readAndUnreadAreIdempotentAndReturnProjectedState() {
    var id = UUID.randomUUID();
    when(repository.findById(id)).thenReturn(Optional.of(notification));
    when(notification.getRecipient()).thenReturn(recipient);
    when(recipient.getId()).thenReturn(currentUserId);
    when(repository.findProjectedById(id)).thenReturn(Optional.of(row));
    stubRow();

    service.markRead(id, principal);
    service.markUnread(id, principal);

    verify(notification).markRead();
    verify(notification).markUnread();
    verify(repository, times(2)).flush();
  }

  @Test
  void unrelatedRecipientCannotMutateNotification() {
    var id = UUID.randomUUID();
    when(repository.findById(id)).thenReturn(Optional.of(notification));
    when(notification.getRecipient()).thenReturn(recipient);
    when(recipient.getId()).thenReturn(UUID.randomUUID());

    assertThatThrownBy(() -> service.markRead(id, principal))
        .isInstanceOf(NotificationAccessForbiddenException.class);
    verify(notification, never()).markRead();
  }

  private void stubRow() {
    lenient().when(row.getId()).thenReturn(UUID.randomUUID());
    lenient().when(row.getType()).thenReturn(NotificationType.POST_LIKED);
    lenient().when(row.getEntityType()).thenReturn(NotificationEntityType.POST);
    lenient().when(row.getEntityId()).thenReturn(UUID.randomUUID());
    lenient().when(row.getMessage()).thenReturn("Creative User liked your post.");
    lenient().when(row.getCreatedAt()).thenReturn(Instant.parse("2026-07-28T10:00:00Z"));
  }
}

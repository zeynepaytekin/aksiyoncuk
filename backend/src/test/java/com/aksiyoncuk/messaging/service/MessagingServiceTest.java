package com.aksiyoncuk.messaging.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.aksiyoncuk.auth.security.AuthenticatedUser;
import com.aksiyoncuk.messaging.dto.*;
import com.aksiyoncuk.messaging.entity.Conversation;
import com.aksiyoncuk.messaging.entity.Message;
import com.aksiyoncuk.messaging.exception.*;
import com.aksiyoncuk.messaging.repository.*;
import com.aksiyoncuk.profile.exception.ProfileNotFoundException;
import com.aksiyoncuk.user.entity.User;
import com.aksiyoncuk.user.repository.UserRepository;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class MessagingServiceTest {
  @Mock private ConversationRepository conversations;
  @Mock private ConversationParticipantRepository participants;
  @Mock private MessageRepository messages;
  @Mock private UserRepository users;
  @Mock private ConversationRow conversationRow;
  @Mock private MessageRow messageRow;
  @Mock private MessagingSummaryRow summaryRow;
  @Mock private Conversation conversation;
  @Mock private User target;
  @Mock private User sender;

  private MessagingService service;
  private UUID currentId;
  private UUID targetId;
  private AuthenticatedUser principal;

  @BeforeEach
  void setUp() {
    service = new MessagingService(conversations, participants, messages, users);
    currentId = UUID.randomUUID();
    targetId = UUID.randomUUID();
    principal = new AuthenticatedUser(currentId);
  }

  @Test
  void normalizesUsernameAndBuildsOrderIndependentKey() {
    assertThat(service.normalizeUsername("  Creative_User ")).isEqualTo("creative_user");
    assertThat(service.directKey(currentId, targetId))
        .isEqualTo(service.directKey(targetId, currentId));
    assertThat(service.directKey(currentId, targetId)).contains(":");
  }

  @Test
  void createsThenReusesDirectConversation() {
    stubStart();
    when(conversations.insertDirectIfAbsent(anyString())).thenReturn(1, 0);

    var created = service.start(principal, new StartConversationRequest("target"));
    var reused = service.start(principal, new StartConversationRequest("TARGET"));

    assertThat(created.created()).isTrue();
    assertThat(reused.created()).isFalse();
    verify(participants, times(2)).insertIfAbsent(targetId, currentId);
    verify(participants, times(2)).insertIfAbsent(targetId, this.targetId);
  }

  @Test
  void rejectsSelfAndMissingTarget() {
    when(target.getId()).thenReturn(currentId);
    when(users.findByUsername("target")).thenReturn(Optional.of(target));
    assertThatThrownBy(() -> service.start(principal, new StartConversationRequest("target")))
        .isInstanceOf(SelfConversationNotAllowedException.class);

    when(users.findByUsername("missing")).thenReturn(Optional.empty());
    assertThatThrownBy(() -> service.start(principal, new StartConversationRequest("missing")))
        .isInstanceOf(ProfileNotFoundException.class);
  }

  @Test
  void validatesAndTrimsMessageContent() {
    assertThat(service.content("  Hello  ")).isEqualTo("Hello");
    assertThatThrownBy(() -> service.content(" \n "))
        .isInstanceOf(InvalidMessagingRequestException.class)
        .extracting("code")
        .isEqualTo("INVALID_MESSAGE_CONTENT");
    assertThatThrownBy(() -> service.content("x".repeat(5001)))
        .isInstanceOf(InvalidMessagingRequestException.class);
  }

  @Test
  void enforcesParticipantAccessAndPagination() {
    when(conversations.existsById(targetId)).thenReturn(true);
    when(participants.existsByConversationIdAndUserId(targetId, currentId)).thenReturn(false);
    assertThatThrownBy(() -> service.get(targetId, principal))
        .isInstanceOf(ConversationAccessForbiddenException.class);

    assertThatThrownBy(() -> service.list(principal, -1, 20))
        .isInstanceOf(InvalidMessagingRequestException.class)
        .extracting("code")
        .isEqualTo("INVALID_MESSAGING_PAGINATION");
    assertThatThrownBy(() -> service.messages(targetId, principal, 0, 101))
        .isInstanceOf(InvalidMessagingRequestException.class);
  }

  @Test
  void sendsTrimmedMessageAndMapsSafeSender() {
    when(conversations.existsById(targetId)).thenReturn(true);
    when(participants.existsByConversationIdAndUserId(targetId, currentId)).thenReturn(true);
    when(conversations.findById(targetId)).thenReturn(Optional.of(conversation));
    when(users.findById(currentId)).thenReturn(Optional.of(sender));
    var saved = mock(Message.class);
    var messageId = UUID.randomUUID();
    when(saved.getId()).thenReturn(messageId);
    when(messages.saveAndFlush(any(Message.class))).thenReturn(saved);
    when(messages.findProjectedById(messageId)).thenReturn(Optional.of(messageRow));
    when(messageRow.getId()).thenReturn(messageId);
    when(messageRow.getConversationId()).thenReturn(targetId);
    when(messageRow.getContent()).thenReturn("Hello");
    when(messageRow.getCreatedAt()).thenReturn(Instant.now());
    when(messageRow.getSenderId()).thenReturn(currentId);
    when(messageRow.getSenderUsername()).thenReturn("sender");
    when(messageRow.getSenderFullName()).thenReturn("Sender User");

    var response = service.send(targetId, principal, new SendMessageRequest("  Hello  "));

    assertThat(response.content()).isEqualTo("Hello");
    assertThat(response.sentByCurrentUser()).isTrue();
    assertThat(response.sender().username()).isEqualTo("sender");
    verify(conversations).touch(eq(targetId), any(Instant.class));
  }

  @Test
  void mapsNullableDeletedSenderAndSummaryCounts() {
    when(messageRow.getId()).thenReturn(UUID.randomUUID());
    when(messageRow.getConversationId()).thenReturn(targetId);
    when(messageRow.getCreatedAt()).thenReturn(Instant.now());
    assertThat(MessageResponse.from(messageRow, currentId).sender()).isNull();

    when(participants.summary(currentId)).thenReturn(summaryRow);
    when(summaryRow.getUnreadConversationCount()).thenReturn(2L);
    when(summaryRow.getUnreadMessageCount()).thenReturn(7L);
    assertThat(service.summary(principal)).isEqualTo(new MessagingSummaryResponse(2, 7));
  }

  @Test
  void markReadIsIdempotentAtServiceBoundary() {
    when(conversations.existsById(targetId)).thenReturn(true);
    when(participants.existsByConversationIdAndUserId(targetId, currentId)).thenReturn(true);
    stubConversationRow();
    service.markRead(targetId, principal);
    service.markRead(targetId, principal);
    verify(participants, times(2)).markRead(eq(targetId), eq(currentId), any(Instant.class));
  }

  private void stubStart() {
    when(target.getId()).thenReturn(targetId);
    when(users.findByUsername("target")).thenReturn(Optional.of(target));
    when(conversations.findIdByDirectKey(anyString())).thenReturn(Optional.of(targetId));
    stubConversationRow();
  }

  private void stubConversationRow() {
    when(conversations.findProjected(targetId, currentId)).thenReturn(Optional.of(conversationRow));
    when(conversationRow.getId()).thenReturn(targetId);
    when(conversationRow.getType()).thenReturn("DIRECT");
    when(conversationRow.getOtherUserId()).thenReturn(targetId);
    when(conversationRow.getOtherUsername()).thenReturn("target");
    when(conversationRow.getOtherFullName()).thenReturn("Target User");
    when(conversationRow.getCreatedAt()).thenReturn(Instant.now());
    when(conversationRow.getUpdatedAt()).thenReturn(Instant.now());
  }
}

package com.aksiyoncuk.messaging.service;

import com.aksiyoncuk.auth.security.AuthenticatedUser;
import com.aksiyoncuk.messaging.dto.*;
import com.aksiyoncuk.messaging.entity.Message;
import com.aksiyoncuk.messaging.exception.*;
import com.aksiyoncuk.messaging.repository.*;
import com.aksiyoncuk.profile.exception.ProfileNotFoundException;
import com.aksiyoncuk.user.repository.UserRepository;
import java.time.Instant;
import java.util.Locale;
import java.util.UUID;
import java.util.regex.Pattern;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MessagingService {
  private static final Pattern USERNAME_PATTERN = Pattern.compile("[a-z0-9._-]{3,30}");

  private final ConversationRepository conversations;
  private final ConversationParticipantRepository participants;
  private final MessageRepository messages;
  private final UserRepository users;

  public MessagingService(
      ConversationRepository conversations,
      ConversationParticipantRepository participants,
      MessageRepository messages,
      UserRepository users) {
    this.conversations = conversations;
    this.participants = participants;
    this.messages = messages;
    this.users = users;
  }

  @Transactional
  public StartConversationResult start(
      AuthenticatedUser principal, StartConversationRequest request) {
    var target =
        users
            .findByUsername(normalizeUsername(request == null ? null : request.username()))
            .orElseThrow(ProfileNotFoundException::new);
    if (target.getId().equals(principal.userId())) {
      throw new SelfConversationNotAllowedException();
    }
    var directKey = directKey(principal.userId(), target.getId());
    var created = conversations.insertDirectIfAbsent(directKey) == 1;
    var conversationId =
        conversations.findIdByDirectKey(directKey).orElseThrow(ConversationNotFoundException::new);
    participants.insertIfAbsent(conversationId, principal.userId());
    participants.insertIfAbsent(conversationId, target.getId());
    return new StartConversationResult(projected(conversationId, principal.userId()), created);
  }

  @Transactional(readOnly = true)
  public ConversationPageResponse list(AuthenticatedUser principal, int page, int size) {
    validateConversationPagination(page, size);
    var result = conversations.findForUser(principal.userId(), PageRequest.of(page, size));
    return new ConversationPageResponse(
        result.getContent().stream().map(ConversationResponse::from).toList(),
        result.getNumber(),
        result.getSize(),
        result.getTotalElements(),
        result.getTotalPages(),
        result.isFirst(),
        result.isLast());
  }

  @Transactional(readOnly = true)
  public ConversationResponse get(UUID conversationId, AuthenticatedUser principal) {
    requireParticipant(conversationId, principal.userId());
    return projected(conversationId, principal.userId());
  }

  @Transactional
  public MessageResponse send(
      UUID conversationId, AuthenticatedUser principal, SendMessageRequest request) {
    requireParticipant(conversationId, principal.userId());
    var content = content(request == null ? null : request.content());
    var conversation =
        conversations.findById(conversationId).orElseThrow(ConversationNotFoundException::new);
    var sender =
        users.findById(principal.userId()).orElseThrow(ConversationAccessForbiddenException::new);
    var message = messages.saveAndFlush(new Message(conversation, sender, content));
    conversations.touch(conversationId, Instant.now());
    return messages
        .findProjectedById(message.getId())
        .map(row -> MessageResponse.from(row, principal.userId()))
        .orElseThrow(ConversationNotFoundException::new);
  }

  @Transactional(readOnly = true)
  public MessagePageResponse messages(
      UUID conversationId, AuthenticatedUser principal, int page, int size) {
    validateMessagePagination(page, size);
    requireParticipant(conversationId, principal.userId());
    var result = messages.findProjected(conversationId, PageRequest.of(page, size));
    return new MessagePageResponse(
        result.getContent().stream()
            .map(row -> MessageResponse.from(row, principal.userId()))
            .toList(),
        result.getNumber(),
        result.getSize(),
        result.getTotalElements(),
        result.getTotalPages(),
        result.isFirst(),
        result.isLast());
  }

  @Transactional
  public ConversationResponse markRead(UUID conversationId, AuthenticatedUser principal) {
    requireParticipant(conversationId, principal.userId());
    participants.markRead(conversationId, principal.userId(), Instant.now());
    return projected(conversationId, principal.userId());
  }

  @Transactional(readOnly = true)
  public MessagingSummaryResponse summary(AuthenticatedUser principal) {
    var row = participants.summary(principal.userId());
    return new MessagingSummaryResponse(
        row.getUnreadConversationCount(), row.getUnreadMessageCount());
  }

  public String normalizeUsername(String username) {
    var normalized = username == null ? "" : username.trim().toLowerCase(Locale.ROOT);
    if (!USERNAME_PATTERN.matcher(normalized).matches()) {
      throw new ProfileNotFoundException();
    }
    return normalized;
  }

  public String directKey(UUID first, UUID second) {
    var left = first.toString();
    var right = second.toString();
    return left.compareTo(right) <= 0 ? left + ":" + right : right + ":" + left;
  }

  public String content(String value) {
    if (value == null || value.trim().isBlank()) {
      throw new InvalidMessagingRequestException(
          "INVALID_MESSAGE_CONTENT", "Message content must not be blank");
    }
    var normalized = value.trim();
    if (normalized.length() > 5000) {
      throw new InvalidMessagingRequestException(
          "INVALID_MESSAGE_CONTENT", "Message content must not exceed 5000 characters");
    }
    return normalized;
  }

  private void requireParticipant(UUID conversationId, UUID userId) {
    if (!conversations.existsById(conversationId)) throw new ConversationNotFoundException();
    if (!participants.existsByConversationIdAndUserId(conversationId, userId)) {
      throw new ConversationAccessForbiddenException();
    }
  }

  private ConversationResponse projected(UUID conversationId, UUID userId) {
    return conversations
        .findProjected(conversationId, userId)
        .map(ConversationResponse::from)
        .orElseThrow(ConversationNotFoundException::new);
  }

  private void validateConversationPagination(int page, int size) {
    if (page < 0 || size < 1 || size > 50) invalidPagination();
  }

  private void validateMessagePagination(int page, int size) {
    if (page < 0 || size < 1 || size > 100) invalidPagination();
  }

  private void invalidPagination() {
    throw new InvalidMessagingRequestException(
        "INVALID_MESSAGING_PAGINATION", "Messaging pagination is invalid");
  }
}

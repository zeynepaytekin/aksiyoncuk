package com.aksiyoncuk.messaging.repository;

import com.aksiyoncuk.messaging.entity.ConversationParticipant;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface ConversationParticipantRepository
    extends JpaRepository<ConversationParticipant, UUID> {
  boolean existsByConversationIdAndUserId(UUID conversationId, UUID userId);

  Optional<ConversationParticipant> findByConversationIdAndUserId(UUID conversationId, UUID userId);

  @Modifying
  @Query(
      value =
          """
          insert into conversation_participants (
            id, conversation_id, user_id, joined_at
          ) values (
            gen_random_uuid(), :conversationId, :userId, current_timestamp
          ) on conflict (conversation_id, user_id) do nothing
          """,
      nativeQuery = true)
  int insertIfAbsent(@Param("conversationId") UUID conversationId, @Param("userId") UUID userId);

  @Modifying
  @Query(
      """
      update ConversationParticipant p set p.lastReadAt = :readAt
      where p.conversation.id = :conversationId and p.user.id = :userId
      """)
  int markRead(
      @Param("conversationId") UUID conversationId,
      @Param("userId") UUID userId,
      @Param("readAt") Instant readAt);

  @Query(
      value =
          """
          select
            count(distinct case when unread.id is not null then mine.conversation_id end)
              as unreadConversationCount,
            count(unread.id) as unreadMessageCount
          from conversation_participants mine
          left join messages unread
            on unread.conversation_id = mine.conversation_id
           and unread.sender_id is distinct from :userId
           and (mine.last_read_at is null or unread.created_at > mine.last_read_at)
          where mine.user_id = :userId
          """,
      nativeQuery = true)
  MessagingSummaryRow summary(@Param("userId") UUID userId);
}

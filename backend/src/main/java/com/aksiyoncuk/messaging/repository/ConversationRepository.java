package com.aksiyoncuk.messaging.repository;

import com.aksiyoncuk.messaging.entity.Conversation;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface ConversationRepository extends JpaRepository<Conversation, UUID> {
  @Modifying
  @Query(
      value =
          """
          insert into conversations (
            id, conversation_type, direct_key, created_at, updated_at
          ) values (
            gen_random_uuid(), 'DIRECT', :directKey, current_timestamp, current_timestamp
          ) on conflict (direct_key) do nothing
          """,
      nativeQuery = true)
  int insertDirectIfAbsent(@Param("directKey") String directKey);

  @Query("select c.id from Conversation c where c.directKey = :directKey")
  Optional<UUID> findIdByDirectKey(@Param("directKey") String directKey);

  @Query(
      value =
          """
          select c.id as id, c.conversation_type as type,
                 c.created_at as createdAt, c.updated_at as updatedAt,
                 other_user.id as otherUserId, other_user.username as otherUsername,
                 other_user.full_name as otherFullName,
                 other_profile.professional_title as otherProfessionalTitle,
                 latest.id as latestMessageId, latest.content as latestMessageContent,
                 latest.created_at as latestMessageCreatedAt,
                 case when latest.sender_id = :userId then true else false end
                   as latestSentByCurrentUser,
                 (select count(*) from messages unread
                  where unread.conversation_id = c.id
                    and unread.sender_id is distinct from :userId
                    and (mine.last_read_at is null or unread.created_at > mine.last_read_at))
                   as unreadCount
          from conversations c
          join conversation_participants mine
            on mine.conversation_id = c.id and mine.user_id = :userId
          join conversation_participants other_participant
            on other_participant.conversation_id = c.id
           and other_participant.user_id <> :userId
          join users other_user on other_user.id = other_participant.user_id
          left join profiles other_profile on other_profile.user_id = other_user.id
          left join lateral (
            select m.id, m.content, m.created_at, m.sender_id
            from messages m where m.conversation_id = c.id
            order by m.created_at desc, m.id desc limit 1
          ) latest on true
          order by c.updated_at desc, c.id desc
          """,
      countQuery =
          """
          select count(*) from conversation_participants mine
          where mine.user_id = :userId
          """,
      nativeQuery = true)
  Page<ConversationRow> findForUser(@Param("userId") UUID userId, Pageable pageable);

  @Query(
      value =
          """
          select c.id as id, c.conversation_type as type,
                 c.created_at as createdAt, c.updated_at as updatedAt,
                 other_user.id as otherUserId, other_user.username as otherUsername,
                 other_user.full_name as otherFullName,
                 other_profile.professional_title as otherProfessionalTitle,
                 latest.id as latestMessageId, latest.content as latestMessageContent,
                 latest.created_at as latestMessageCreatedAt,
                 case when latest.sender_id = :userId then true else false end
                   as latestSentByCurrentUser,
                 (select count(*) from messages unread
                  where unread.conversation_id = c.id
                    and unread.sender_id is distinct from :userId
                    and (mine.last_read_at is null or unread.created_at > mine.last_read_at))
                   as unreadCount
          from conversations c
          join conversation_participants mine
            on mine.conversation_id = c.id and mine.user_id = :userId
          join conversation_participants other_participant
            on other_participant.conversation_id = c.id
           and other_participant.user_id <> :userId
          join users other_user on other_user.id = other_participant.user_id
          left join profiles other_profile on other_profile.user_id = other_user.id
          left join lateral (
            select m.id, m.content, m.created_at, m.sender_id
            from messages m where m.conversation_id = c.id
            order by m.created_at desc, m.id desc limit 1
          ) latest on true
          where c.id = :conversationId
          """,
      nativeQuery = true)
  Optional<ConversationRow> findProjected(
      @Param("conversationId") UUID conversationId, @Param("userId") UUID userId);

  @Modifying
  @Query("update Conversation c set c.updatedAt = :now where c.id = :id")
  int touch(@Param("id") UUID id, @Param("now") Instant now);
}

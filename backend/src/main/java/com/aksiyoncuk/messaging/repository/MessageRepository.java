package com.aksiyoncuk.messaging.repository;

import com.aksiyoncuk.messaging.entity.Message;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface MessageRepository extends JpaRepository<Message, UUID> {
  @Query(
      value =
          """
          select m.id as id, m.conversation_id as conversationId,
                 m.content as content, m.created_at as createdAt,
                 sender.id as senderId, sender.username as senderUsername,
                 sender.full_name as senderFullName,
                 profile.professional_title as senderProfessionalTitle
          from messages m
          left join users sender on sender.id = m.sender_id
          left join profiles profile on profile.user_id = sender.id
          where m.conversation_id = :conversationId
          order by m.created_at desc, m.id desc
          """,
      countQuery = "select count(*) from messages m where m.conversation_id = :conversationId",
      nativeQuery = true)
  Page<MessageRow> findProjected(@Param("conversationId") UUID conversationId, Pageable pageable);

  @Query(
      value =
          """
          select m.id as id, m.conversation_id as conversationId,
                 m.content as content, m.created_at as createdAt,
                 sender.id as senderId, sender.username as senderUsername,
                 sender.full_name as senderFullName,
                 profile.professional_title as senderProfessionalTitle
          from messages m
          left join users sender on sender.id = m.sender_id
          left join profiles profile on profile.user_id = sender.id
          where m.id = :id
          """,
      nativeQuery = true)
  java.util.Optional<MessageRow> findProjectedById(@Param("id") UUID id);
}

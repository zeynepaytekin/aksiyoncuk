package com.aksiyoncuk.post.like.repository;

import com.aksiyoncuk.post.like.entity.PostLike;
import java.time.Instant;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PostLikeRepository extends JpaRepository<PostLike, UUID> {

  @Modifying
  @Query(
      value =
          """
          INSERT INTO post_likes (id, post_id, user_id, created_at)
          VALUES (:id, :postId, :userId, :createdAt)
          ON CONFLICT (post_id, user_id) DO NOTHING
          """,
      nativeQuery = true)
  int insertIfAbsent(
      @Param("id") UUID id,
      @Param("postId") UUID postId,
      @Param("userId") UUID userId,
      @Param("createdAt") Instant createdAt);

  @Modifying
  @Query("DELETE FROM PostLike l WHERE l.post.id = :postId AND l.user.id = :userId")
  int deleteByPostIdAndUserId(@Param("postId") UUID postId, @Param("userId") UUID userId);

  long countByPostId(UUID postId);

  boolean existsByPostIdAndUserId(UUID postId, UUID userId);
}

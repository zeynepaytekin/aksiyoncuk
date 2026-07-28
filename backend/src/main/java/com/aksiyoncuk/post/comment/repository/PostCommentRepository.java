package com.aksiyoncuk.post.comment.repository;

import com.aksiyoncuk.post.comment.entity.PostComment;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PostCommentRepository extends JpaRepository<PostComment, UUID> {

  @Query(
      value =
          """
          SELECT new com.aksiyoncuk.post.comment.repository.CommentRow(
            c.id, p.id, c.content, c.createdAt, c.updatedAt,
            u.id, u.username, u.fullName, pr.professionalTitle)
          FROM PostComment c
          JOIN c.post p
          JOIN c.author u
          JOIN Profile pr ON pr.user = u
          WHERE p.id = :postId
          """,
      countQuery = "SELECT count(c) FROM PostComment c WHERE c.post.id = :postId")
  Page<CommentRow> findByPostIdProjected(@Param("postId") UUID postId, Pageable pageable);

  @Query(
      """
      SELECT new com.aksiyoncuk.post.comment.repository.CommentRow(
        c.id, p.id, c.content, c.createdAt, c.updatedAt,
        u.id, u.username, u.fullName, pr.professionalTitle)
      FROM PostComment c
      JOIN c.post p
      JOIN c.author u
      JOIN Profile pr ON pr.user = u
      WHERE c.id = :id
      """)
  Optional<CommentRow> findProjectedById(@Param("id") UUID id);

  long countByPostId(UUID postId);
}

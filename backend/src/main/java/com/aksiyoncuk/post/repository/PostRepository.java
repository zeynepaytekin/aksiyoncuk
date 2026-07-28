package com.aksiyoncuk.post.repository;

import com.aksiyoncuk.post.entity.Post;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PostRepository extends JpaRepository<Post, UUID> {

  @Query(
      value =
          """
          SELECT new com.aksiyoncuk.post.repository.PostRow(
            p.id, p.content, p.createdAt, p.updatedAt,
            u.id, u.username, u.fullName, pr.professionalTitle,
            (SELECT count(c) FROM PostComment c WHERE c.post = p),
            (SELECT count(l) FROM PostLike l WHERE l.post = p),
            CASE WHEN :currentUserId IS NOT NULL AND
              (SELECT count(ul) FROM PostLike ul
                WHERE ul.post = p AND ul.user.id = :currentUserId) > 0
              THEN true ELSE false END)
          FROM Post p
          JOIN p.author u
          JOIN Profile pr ON pr.user = u
          """,
      countQuery = "SELECT count(p) FROM Post p")
  Page<PostRow> findFeed(@Param("currentUserId") UUID currentUserId, Pageable pageable);

  @Query(
      value =
          """
          SELECT new com.aksiyoncuk.post.repository.PostRow(
            p.id, p.content, p.createdAt, p.updatedAt,
            u.id, u.username, u.fullName, pr.professionalTitle,
            (SELECT count(c) FROM PostComment c WHERE c.post = p),
            (SELECT count(l) FROM PostLike l WHERE l.post = p),
            CASE WHEN (SELECT count(ul) FROM PostLike ul
              WHERE ul.post = p AND ul.user.id = :currentUserId) > 0
              THEN true ELSE false END)
          FROM Post p
          JOIN p.author u
          JOIN Profile pr ON pr.user = u
          WHERE u.id = :authorId
          """,
      countQuery = "SELECT count(p) FROM Post p WHERE p.author.id = :authorId")
  Page<PostRow> findByAuthorIdProjected(
      @Param("authorId") UUID authorId,
      @Param("currentUserId") UUID currentUserId,
      Pageable pageable);

  @Query(
      """
      SELECT new com.aksiyoncuk.post.repository.PostRow(
        p.id, p.content, p.createdAt, p.updatedAt,
        u.id, u.username, u.fullName, pr.professionalTitle,
        (SELECT count(c) FROM PostComment c WHERE c.post = p),
        (SELECT count(l) FROM PostLike l WHERE l.post = p),
        CASE WHEN :currentUserId IS NOT NULL AND
          (SELECT count(ul) FROM PostLike ul
            WHERE ul.post = p AND ul.user.id = :currentUserId) > 0
          THEN true ELSE false END)
      FROM Post p
      JOIN p.author u
      JOIN Profile pr ON pr.user = u
      WHERE p.id = :id
      """)
  Optional<PostRow> findProjectedById(
      @Param("id") UUID id, @Param("currentUserId") UUID currentUserId);
}

package com.aksiyoncuk.post.comment.dto;

import com.aksiyoncuk.post.comment.repository.CommentRow;
import java.time.Instant;
import java.util.UUID;

public record CommentResponse(
    UUID id,
    UUID postId,
    String content,
    Instant createdAt,
    Instant updatedAt,
    CommentAuthorResponse author,
    boolean ownedByCurrentUser) {

  public static CommentResponse from(CommentRow row, UUID currentUserId) {
    return new CommentResponse(
        row.id(),
        row.postId(),
        row.content(),
        row.createdAt(),
        row.updatedAt(),
        new CommentAuthorResponse(
            row.authorId(), row.username(), row.fullName(), row.professionalTitle()),
        currentUserId != null && currentUserId.equals(row.authorId()));
  }
}

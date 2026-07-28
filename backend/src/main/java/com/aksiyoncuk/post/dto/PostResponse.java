package com.aksiyoncuk.post.dto;

import com.aksiyoncuk.post.repository.PostRow;
import java.time.Instant;
import java.util.UUID;

public record PostResponse(
    UUID id,
    String content,
    Instant createdAt,
    Instant updatedAt,
    PostAuthorResponse author,
    boolean ownedByCurrentUser) {

  public static PostResponse from(PostRow row, UUID currentUserId) {
    return new PostResponse(
        row.id(),
        row.content(),
        row.createdAt(),
        row.updatedAt(),
        new PostAuthorResponse(
            row.authorId(), row.username(), row.fullName(), row.professionalTitle()),
        currentUserId != null && currentUserId.equals(row.authorId()));
  }
}

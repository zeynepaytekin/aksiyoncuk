package com.aksiyoncuk.post.dto;

import com.aksiyoncuk.media.dto.MediaListItemResponse;
import com.aksiyoncuk.post.repository.PostRow;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record PostResponse(
    UUID id,
    String content,
    Instant createdAt,
    Instant updatedAt,
    PostAuthorResponse author,
    boolean ownedByCurrentUser,
    long commentCount,
    long likeCount,
    boolean likedByCurrentUser,
    List<MediaListItemResponse> media) {

  public static PostResponse from(PostRow row, UUID currentUserId) {
    return new PostResponse(
        row.id(),
        row.content(),
        row.createdAt(),
        row.updatedAt(),
        new PostAuthorResponse(
            row.authorId(), row.username(), row.fullName(), row.professionalTitle()),
        currentUserId != null && currentUserId.equals(row.authorId()),
        row.commentCount(),
        row.likeCount(),
        currentUserId != null && row.likedByCurrentUser(),
        List.of());
  }

  public PostResponse withMedia(List<MediaListItemResponse> value) {
    return new PostResponse(
        id,
        content,
        createdAt,
        updatedAt,
        author,
        ownedByCurrentUser,
        commentCount,
        likeCount,
        likedByCurrentUser,
        List.copyOf(value));
  }
}

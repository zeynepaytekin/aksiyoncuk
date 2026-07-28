package com.aksiyoncuk.post.comment.repository;

import java.time.Instant;
import java.util.UUID;

public record CommentRow(
    UUID id,
    UUID postId,
    String content,
    Instant createdAt,
    Instant updatedAt,
    UUID authorId,
    String username,
    String fullName,
    String professionalTitle) {}

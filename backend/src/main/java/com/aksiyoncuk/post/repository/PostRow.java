package com.aksiyoncuk.post.repository;

import java.time.Instant;
import java.util.UUID;

public record PostRow(
    UUID id,
    String content,
    Instant createdAt,
    Instant updatedAt,
    UUID authorId,
    String username,
    String fullName,
    String professionalTitle,
    long commentCount,
    long likeCount,
    boolean likedByCurrentUser) {}

package com.aksiyoncuk.post.comment.dto;

import java.util.UUID;

public record CommentAuthorResponse(
    UUID id, String username, String fullName, String professionalTitle) {}

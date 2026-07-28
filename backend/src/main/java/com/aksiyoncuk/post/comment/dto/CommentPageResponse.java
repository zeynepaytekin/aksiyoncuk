package com.aksiyoncuk.post.comment.dto;

import java.util.List;

public record CommentPageResponse(
    List<CommentResponse> content,
    int page,
    int size,
    long totalElements,
    int totalPages,
    boolean first,
    boolean last) {}

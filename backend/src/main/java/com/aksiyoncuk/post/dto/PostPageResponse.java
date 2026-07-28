package com.aksiyoncuk.post.dto;

import java.util.List;

public record PostPageResponse(
    List<PostResponse> content,
    int page,
    int size,
    long totalElements,
    int totalPages,
    boolean first,
    boolean last) {}

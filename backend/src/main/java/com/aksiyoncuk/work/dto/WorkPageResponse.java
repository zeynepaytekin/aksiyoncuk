package com.aksiyoncuk.work.dto;

import java.util.List;

public record WorkPageResponse(
    List<WorkResponse> content,
    int page,
    int size,
    long totalElements,
    int totalPages,
    boolean first,
    boolean last) {}

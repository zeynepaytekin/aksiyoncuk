package com.aksiyoncuk.job.application.dto;

import java.util.List;

public record JobApplicationPageResponse(
    List<JobApplicationResponse> content,
    int page,
    int size,
    long totalElements,
    int totalPages,
    boolean first,
    boolean last) {}

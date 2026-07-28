package com.aksiyoncuk.network.dto;

import java.util.List;

public record NetworkPageResponse(
    List<NetworkUserResponse> content,
    int page,
    int size,
    long totalElements,
    int totalPages,
    boolean first,
    boolean last) {}

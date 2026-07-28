package com.aksiyoncuk.notification.dto;

import java.util.List;

public record NotificationPageResponse(
    List<NotificationResponse> content,
    int page,
    int size,
    long totalElements,
    int totalPages,
    boolean first,
    boolean last) {}

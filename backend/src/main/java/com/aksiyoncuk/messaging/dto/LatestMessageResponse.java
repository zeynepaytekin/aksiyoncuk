package com.aksiyoncuk.messaging.dto;

import java.time.Instant;
import java.util.UUID;

public record LatestMessageResponse(
    UUID id, String content, Instant createdAt, boolean sentByCurrentUser) {}

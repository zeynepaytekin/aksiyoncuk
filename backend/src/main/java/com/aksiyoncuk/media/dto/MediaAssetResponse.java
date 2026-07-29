package com.aksiyoncuk.media.dto;

import com.aksiyoncuk.media.entity.MediaUsageType;
import java.time.Instant;
import java.util.UUID;

public record MediaAssetResponse(
    UUID id,
    String url,
    String contentType,
    long sizeBytes,
    MediaUsageType usageType,
    Integer displayOrder,
    Instant createdAt) {}

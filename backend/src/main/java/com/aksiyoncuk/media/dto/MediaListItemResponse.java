package com.aksiyoncuk.media.dto;

import java.util.UUID;

public record MediaListItemResponse(
    UUID id, String url, String contentType, Integer width, Integer height, int displayOrder) {}

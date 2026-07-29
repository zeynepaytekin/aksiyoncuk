package com.aksiyoncuk.media.dto;

import java.util.List;
import java.util.UUID;

public record MediaOrderRequest(List<UUID> mediaIds) {}

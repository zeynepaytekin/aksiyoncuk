package com.aksiyoncuk.post.dto;

import io.swagger.v3.oas.annotations.media.Schema;

public record CreatePostRequest(
    @Schema(example = "Sharing a new creative project.") String content) {}

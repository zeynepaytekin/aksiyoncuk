package com.aksiyoncuk.work.dto;

import io.swagger.v3.oas.annotations.media.Schema;

public record CreateWorkRequest(
    @Schema(example = "My Short Film") String title,
    @Schema(example = "Project description", nullable = true) String description,
    @Schema(example = "SHORT_FILM") String workType,
    @Schema(example = "https://example.com/project", nullable = true) String projectUrl,
    @Schema(example = "2026", nullable = true) Integer releaseYear) {}

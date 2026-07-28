package com.aksiyoncuk.work.repository;

import com.aksiyoncuk.work.entity.WorkType;
import java.time.Instant;
import java.util.UUID;

public record WorkRow(
    UUID id,
    String title,
    String description,
    WorkType workType,
    String projectUrl,
    Integer releaseYear,
    Instant createdAt,
    Instant updatedAt,
    UUID ownerId,
    String username,
    String fullName,
    String professionalTitle) {}

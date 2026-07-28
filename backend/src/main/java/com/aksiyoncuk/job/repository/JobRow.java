package com.aksiyoncuk.job.repository;

import com.aksiyoncuk.job.entity.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record JobRow(
    UUID id,
    String title,
    String description,
    JobCategory category,
    WorkMode workMode,
    String location,
    CompensationType compensationType,
    BigDecimal compensationAmount,
    String currency,
    JobStatus status,
    Instant applicationDeadline,
    Instant createdAt,
    Instant updatedAt,
    UUID ownerId,
    String username,
    String fullName,
    String professionalTitle) {}

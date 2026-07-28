package com.aksiyoncuk.job.dto;

import com.aksiyoncuk.job.entity.*;
import com.aksiyoncuk.job.repository.JobRow;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record JobResponse(
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
    JobOwnerResponse owner,
    boolean ownedByCurrentUser) {
  public static JobResponse from(JobRow row, UUID currentUserId) {
    return new JobResponse(
        row.id(),
        row.title(),
        row.description(),
        row.category(),
        row.workMode(),
        row.location(),
        row.compensationType(),
        row.compensationAmount(),
        row.currency(),
        row.status(),
        row.applicationDeadline(),
        row.createdAt(),
        row.updatedAt(),
        new JobOwnerResponse(
            row.ownerId(), row.username(), row.fullName(), row.professionalTitle()),
        currentUserId != null && currentUserId.equals(row.ownerId()));
  }
}

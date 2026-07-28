package com.aksiyoncuk.work.dto;

import com.aksiyoncuk.work.entity.WorkType;
import com.aksiyoncuk.work.repository.WorkRow;
import java.time.Instant;
import java.util.UUID;

public record WorkResponse(
    UUID id,
    String title,
    String description,
    WorkType workType,
    String projectUrl,
    Integer releaseYear,
    Instant createdAt,
    Instant updatedAt,
    WorkOwnerResponse owner,
    boolean ownedByCurrentUser) {

  public static WorkResponse from(WorkRow row, UUID currentUserId) {
    return new WorkResponse(
        row.id(),
        row.title(),
        row.description(),
        row.workType(),
        row.projectUrl(),
        row.releaseYear(),
        row.createdAt(),
        row.updatedAt(),
        new WorkOwnerResponse(
            row.ownerId(), row.username(), row.fullName(), row.professionalTitle()),
        currentUserId != null && currentUserId.equals(row.ownerId()));
  }
}

package com.aksiyoncuk.work.dto;

import com.aksiyoncuk.media.dto.MediaListItemResponse;
import com.aksiyoncuk.work.entity.WorkType;
import com.aksiyoncuk.work.repository.WorkRow;
import java.time.Instant;
import java.util.List;
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
    boolean ownedByCurrentUser,
    List<MediaListItemResponse> media) {

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
        currentUserId != null && currentUserId.equals(row.ownerId()),
        List.of());
  }

  public WorkResponse withMedia(List<MediaListItemResponse> value) {
    return new WorkResponse(
        id,
        title,
        description,
        workType,
        projectUrl,
        releaseYear,
        createdAt,
        updatedAt,
        owner,
        ownedByCurrentUser,
        List.copyOf(value));
  }
}

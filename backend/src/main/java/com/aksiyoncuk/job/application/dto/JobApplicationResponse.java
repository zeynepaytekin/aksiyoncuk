package com.aksiyoncuk.job.application.dto;

import com.aksiyoncuk.job.application.entity.JobApplicationStatus;
import com.aksiyoncuk.job.application.repository.JobApplicationRow;
import java.time.Instant;
import java.util.UUID;

public record JobApplicationResponse(
    UUID id,
    JobApplicationStatus status,
    String coverLetter,
    Instant appliedAt,
    Instant updatedAt,
    Instant withdrawnAt,
    Instant reviewedAt,
    JobApplicationJobResponse job,
    JobApplicationApplicantResponse applicant,
    boolean ownedByCurrentApplicant,
    boolean manageableByCurrentJobOwner) {
  public static JobApplicationResponse from(JobApplicationRow row, UUID currentUserId) {
    return new JobApplicationResponse(
        row.id(),
        row.status(),
        row.coverLetter(),
        row.appliedAt(),
        row.updatedAt(),
        row.withdrawnAt(),
        row.reviewedAt(),
        new JobApplicationJobResponse(
            row.jobId(),
            row.jobTitle(),
            row.jobStatus(),
            new JobApplicationOwnerResponse(
                row.ownerId(),
                row.ownerUsername(),
                row.ownerFullName(),
                row.ownerProfessionalTitle())),
        new JobApplicationApplicantResponse(
            row.applicantId(),
            row.applicantUsername(),
            row.applicantFullName(),
            row.applicantProfessionalTitle()),
        currentUserId != null && currentUserId.equals(row.applicantId()),
        currentUserId != null && currentUserId.equals(row.ownerId()));
  }
}

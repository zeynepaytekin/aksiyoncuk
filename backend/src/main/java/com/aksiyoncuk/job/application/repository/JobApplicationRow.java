package com.aksiyoncuk.job.application.repository;

import com.aksiyoncuk.job.application.entity.JobApplicationStatus;
import com.aksiyoncuk.job.entity.JobStatus;
import java.time.Instant;
import java.util.UUID;

public record JobApplicationRow(
    UUID id,
    JobApplicationStatus status,
    String coverLetter,
    Instant appliedAt,
    Instant updatedAt,
    Instant withdrawnAt,
    Instant reviewedAt,
    UUID jobId,
    String jobTitle,
    JobStatus jobStatus,
    UUID ownerId,
    String ownerUsername,
    String ownerFullName,
    String ownerProfessionalTitle,
    UUID applicantId,
    String applicantUsername,
    String applicantFullName,
    String applicantProfessionalTitle) {}

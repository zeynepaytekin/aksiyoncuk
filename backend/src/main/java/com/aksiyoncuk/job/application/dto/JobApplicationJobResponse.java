package com.aksiyoncuk.job.application.dto;

import com.aksiyoncuk.job.entity.JobStatus;
import java.util.UUID;

public record JobApplicationJobResponse(
    UUID id, String title, JobStatus status, JobApplicationOwnerResponse owner) {}

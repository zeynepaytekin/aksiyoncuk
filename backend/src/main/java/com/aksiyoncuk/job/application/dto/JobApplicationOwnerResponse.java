package com.aksiyoncuk.job.application.dto;

import java.util.UUID;

public record JobApplicationOwnerResponse(
    UUID id, String username, String fullName, String professionalTitle) {}

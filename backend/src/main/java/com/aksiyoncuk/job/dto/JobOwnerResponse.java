package com.aksiyoncuk.job.dto;

import java.util.UUID;

public record JobOwnerResponse(
    UUID id, String username, String fullName, String professionalTitle) {}

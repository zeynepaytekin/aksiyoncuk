package com.aksiyoncuk.work.dto;

import java.util.UUID;

public record WorkOwnerResponse(
    UUID id, String username, String fullName, String professionalTitle) {}

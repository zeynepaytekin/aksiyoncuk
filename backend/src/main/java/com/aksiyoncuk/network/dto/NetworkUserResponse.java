package com.aksiyoncuk.network.dto;

import java.util.UUID;

public record NetworkUserResponse(
    UUID id,
    String username,
    String fullName,
    String professionalTitle,
    boolean followedByCurrentUser) {}

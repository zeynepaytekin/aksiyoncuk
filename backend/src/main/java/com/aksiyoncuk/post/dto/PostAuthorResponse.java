package com.aksiyoncuk.post.dto;

import java.util.UUID;

public record PostAuthorResponse(
    UUID id, String username, String fullName, String professionalTitle) {}

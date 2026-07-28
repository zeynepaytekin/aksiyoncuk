package com.aksiyoncuk.messaging.dto;

import java.util.UUID;

public record ConversationUserResponse(
    UUID id, String username, String fullName, String professionalTitle) {}

package com.aksiyoncuk.notification.dto;

import java.util.UUID;

public record NotificationActorResponse(
    UUID id, String username, String fullName, String professionalTitle) {}

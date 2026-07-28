package com.aksiyoncuk.auth.dto;

import java.time.Instant;

public record AuthResponse(
    String accessToken,
    Instant accessTokenExpiresAt,
    String refreshToken,
    Instant refreshTokenExpiresAt,
    String tokenType,
    AuthUserResponse user) {}

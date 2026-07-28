package com.aksiyoncuk.auth.service;

import com.aksiyoncuk.auth.entity.RefreshToken;
import java.time.Instant;

public record IssuedRefreshToken(String value, Instant expiresAt, RefreshToken entity) {}

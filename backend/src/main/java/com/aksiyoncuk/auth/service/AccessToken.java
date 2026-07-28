package com.aksiyoncuk.auth.service;

import java.time.Instant;

public record AccessToken(String value, Instant expiresAt) {}

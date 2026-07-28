package com.aksiyoncuk.auth.config;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "app.jwt")
public record JwtProperties(
    @NotBlank String accessSecret,
    @Min(60) long accessExpirationSeconds,
    @Min(300) long refreshExpirationSeconds) {}

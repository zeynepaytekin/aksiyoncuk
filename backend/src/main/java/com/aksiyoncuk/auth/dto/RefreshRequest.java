package com.aksiyoncuk.auth.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RefreshRequest(
    @Schema(example = "opaque-refresh-token")
        @NotBlank(message = "Refresh token is required") @Size(max = 512, message = "Refresh token is invalid") String refreshToken) {}

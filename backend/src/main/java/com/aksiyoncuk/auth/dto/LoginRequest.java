package com.aksiyoncuk.auth.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LoginRequest(
    @Schema(example = "user@example.com")
        @NotBlank(message = "Identifier is required") @Size(max = 254, message = "Identifier must be at most 254 characters") String identifier,
    @Schema(example = "ExamplePassword123!")
        @NotBlank(message = "Password is required") @Size(max = 72, message = "Password must be at most 72 characters") String password) {

  public LoginRequest {
    identifier = identifier == null ? null : identifier.trim();
  }
}

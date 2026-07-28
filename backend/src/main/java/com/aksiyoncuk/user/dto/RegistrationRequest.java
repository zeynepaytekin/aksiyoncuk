package com.aksiyoncuk.user.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegistrationRequest(
    @Schema(example = "user@example.com")
        @NotBlank(message = "Email is required") @Email(message = "Email must be valid") @Size(max = 254, message = "Email must be at most 254 characters") String email,
    @Schema(example = "creativeuser")
        @NotBlank(message = "Username is required") @Size(min = 3, max = 30, message = "Username must be between 3 and 30 characters") @Pattern(
            regexp = "^[A-Za-z0-9._]+$",
            message = "Username may contain only letters, numbers, periods, and underscores")
        String username,
    @Schema(example = "ExamplePassword123!")
        @NotBlank(message = "Password is required") @Size(min = 12, max = 72, message = "Password must be between 12 and 72 characters") String password,
    @Schema(example = "Creative User")
        @NotBlank(message = "Full name is required") @Size(max = 100, message = "Full name must be at most 100 characters") String fullName) {

  public RegistrationRequest {
    email = trimNullable(email);
    username = trimNullable(username);
    fullName = trimNullable(fullName);
  }

  private static String trimNullable(String value) {
    return value == null ? null : value.trim();
  }
}

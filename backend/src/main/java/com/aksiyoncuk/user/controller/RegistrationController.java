package com.aksiyoncuk.user.controller;

import com.aksiyoncuk.common.response.ApiErrorResponse;
import com.aksiyoncuk.user.dto.RegistrationRequest;
import com.aksiyoncuk.user.dto.RegistrationResponse;
import com.aksiyoncuk.user.service.UserRegistrationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import jakarta.validation.Valid;
import java.net.URI;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class RegistrationController {

  private final UserRegistrationService registrationService;

  public RegistrationController(UserRegistrationService registrationService) {
    this.registrationService = registrationService;
  }

  @PostMapping("/register")
  @Operation(
      summary = "Register a user",
      description = "Creates an active user and an empty profile in one transaction.")
  @ApiResponses({
    @ApiResponse(
        responseCode = "201",
        description = "Registration succeeded",
        content = @Content(schema = @Schema(implementation = RegistrationResponse.class))),
    @ApiResponse(
        responseCode = "400",
        description = "Request validation failed",
        content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
    @ApiResponse(
        responseCode = "409",
        description = "Email or username already exists",
        content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
  })
  ResponseEntity<RegistrationResponse> register(@Valid @RequestBody RegistrationRequest request) {
    var response = registrationService.register(request);
    return ResponseEntity.created(URI.create("/api/v1/users/" + response.id())).body(response);
  }
}

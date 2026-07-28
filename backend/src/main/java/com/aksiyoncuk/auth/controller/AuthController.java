package com.aksiyoncuk.auth.controller;

import com.aksiyoncuk.auth.dto.AuthResponse;
import com.aksiyoncuk.auth.dto.AuthUserResponse;
import com.aksiyoncuk.auth.dto.LoginRequest;
import com.aksiyoncuk.auth.dto.RefreshRequest;
import com.aksiyoncuk.auth.security.AuthenticatedUser;
import com.aksiyoncuk.auth.service.AuthenticationService;
import com.aksiyoncuk.auth.service.TokenContext;
import com.aksiyoncuk.common.response.ApiErrorResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

  private final AuthenticationService authenticationService;

  public AuthController(AuthenticationService authenticationService) {
    this.authenticationService = authenticationService;
  }

  @PostMapping("/login")
  @Operation(summary = "Log in with email or username")
  @ApiResponses({
    @ApiResponse(
        responseCode = "200",
        content = @Content(schema = @Schema(implementation = AuthResponse.class))),
    @ApiResponse(
        responseCode = "400",
        content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
    @ApiResponse(
        responseCode = "401",
        content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
  })
  AuthResponse login(@Valid @RequestBody LoginRequest request, HttpServletRequest servletRequest) {
    return authenticationService.login(
        request.identifier(), request.password(), tokenContext(servletRequest));
  }

  @PostMapping("/refresh")
  @Operation(summary = "Rotate a refresh token")
  @ApiResponses({
    @ApiResponse(
        responseCode = "200",
        content = @Content(schema = @Schema(implementation = AuthResponse.class))),
    @ApiResponse(
        responseCode = "400",
        content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
    @ApiResponse(
        responseCode = "401",
        content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
  })
  AuthResponse refresh(
      @Valid @RequestBody RefreshRequest request, HttpServletRequest servletRequest) {
    return authenticationService.refresh(request.refreshToken(), tokenContext(servletRequest));
  }

  @PostMapping("/logout")
  @Operation(summary = "Revoke a refresh token")
  @ApiResponses({
    @ApiResponse(responseCode = "204", description = "Logout completed"),
    @ApiResponse(
        responseCode = "400",
        content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
  })
  ResponseEntity<Void> logout(@Valid @RequestBody RefreshRequest request) {
    authenticationService.logout(request.refreshToken());
    return ResponseEntity.noContent().build();
  }

  @GetMapping("/me")
  @Operation(summary = "Get the current user")
  @SecurityRequirement(name = "bearerAuth")
  @ApiResponses({
    @ApiResponse(
        responseCode = "200",
        content = @Content(schema = @Schema(implementation = AuthUserResponse.class))),
    @ApiResponse(
        responseCode = "401",
        content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
    @ApiResponse(
        responseCode = "403",
        content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
  })
  AuthUserResponse me(@AuthenticationPrincipal AuthenticatedUser principal) {
    return authenticationService.currentUser(principal);
  }

  private TokenContext tokenContext(HttpServletRequest request) {
    return new TokenContext(request.getHeader("User-Agent"), request.getRemoteAddr());
  }
}

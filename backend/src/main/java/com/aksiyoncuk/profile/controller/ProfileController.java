package com.aksiyoncuk.profile.controller;

import com.aksiyoncuk.auth.security.AuthenticatedUser;
import com.aksiyoncuk.common.response.ApiErrorResponse;
import com.aksiyoncuk.profile.dto.CurrentProfileResponse;
import com.aksiyoncuk.profile.dto.PublicProfileResponse;
import com.aksiyoncuk.profile.dto.UpdateProfileRequest;
import com.aksiyoncuk.profile.service.ProfileService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/profiles")
public class ProfileController {

  private final ProfileService profileService;

  public ProfileController(ProfileService profileService) {
    this.profileService = profileService;
  }

  @GetMapping("/me")
  @Operation(summary = "Get the authenticated user's private profile")
  @SecurityRequirement(name = "bearerAuth")
  @ApiResponses({
    @ApiResponse(
        responseCode = "200",
        content = @Content(schema = @Schema(implementation = CurrentProfileResponse.class))),
    @ApiResponse(
        responseCode = "401",
        content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
  })
  CurrentProfileResponse currentProfile(@AuthenticationPrincipal AuthenticatedUser principal) {
    return profileService.currentProfile(principal);
  }

  @PatchMapping("/me")
  @Operation(
      summary = "Partially update the authenticated user's profile",
      description =
          "Omitted fields remain unchanged. Explicit null clears nullable profile fields.")
  @SecurityRequirement(name = "bearerAuth")
  @ApiResponses({
    @ApiResponse(
        responseCode = "200",
        content = @Content(schema = @Schema(implementation = CurrentProfileResponse.class))),
    @ApiResponse(
        responseCode = "400",
        content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
    @ApiResponse(
        responseCode = "401",
        content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
  })
  CurrentProfileResponse updateCurrentProfile(
      @AuthenticationPrincipal AuthenticatedUser principal,
      @Valid @RequestBody UpdateProfileRequest request) {
    return profileService.updateCurrentProfile(principal, request);
  }

  @GetMapping("/{username}")
  @Operation(summary = "Get a public profile by username")
  @ApiResponses({
    @ApiResponse(
        responseCode = "200",
        content = @Content(schema = @Schema(implementation = PublicProfileResponse.class))),
    @ApiResponse(
        responseCode = "400",
        content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
    @ApiResponse(
        responseCode = "404",
        content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
  })
  PublicProfileResponse publicProfile(
      @PathVariable String username, @AuthenticationPrincipal AuthenticatedUser principal) {
    return profileService.publicProfile(username, principal);
  }
}

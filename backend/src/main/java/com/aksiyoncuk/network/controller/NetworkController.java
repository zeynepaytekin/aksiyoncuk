package com.aksiyoncuk.network.controller;

import com.aksiyoncuk.auth.security.AuthenticatedUser;
import com.aksiyoncuk.common.response.ApiErrorResponse;
import com.aksiyoncuk.network.dto.*;
import com.aksiyoncuk.network.service.FollowService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class NetworkController {
  private final FollowService follows;

  public NetworkController(FollowService follows) {
    this.follows = follows;
  }

  @PutMapping("/users/{username}/follow")
  @Operation(
      summary = "Follow a user",
      description = "Idempotently follows the normalized username.")
  @SecurityRequirement(name = "bearerAuth")
  @ApiResponses({
    @ApiResponse(
        responseCode = "200",
        content = @Content(schema = @Schema(implementation = FollowResponse.class))),
    @ApiResponse(
        responseCode = "400",
        content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
    @ApiResponse(responseCode = "401"),
    @ApiResponse(responseCode = "404")
  })
  FollowResponse follow(
      @PathVariable String username, @AuthenticationPrincipal AuthenticatedUser principal) {
    return follows.follow(principal, username);
  }

  @DeleteMapping("/users/{username}/follow")
  @Operation(summary = "Unfollow a user", description = "Idempotently removes the relationship.")
  @SecurityRequirement(name = "bearerAuth")
  FollowResponse unfollow(
      @PathVariable String username, @AuthenticationPrincipal AuthenticatedUser principal) {
    return follows.unfollow(principal, username);
  }

  @GetMapping("/users/{username}/followers")
  @Operation(summary = "List followers newest first")
  NetworkPageResponse followers(
      @PathVariable String username,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size,
      @Parameter(hidden = true) @AuthenticationPrincipal AuthenticatedUser principal) {
    return follows.followers(username, page, size, principal);
  }

  @GetMapping("/users/{username}/following")
  @Operation(summary = "List followed users newest first")
  NetworkPageResponse following(
      @PathVariable String username,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size,
      @Parameter(hidden = true) @AuthenticationPrincipal AuthenticatedUser principal) {
    return follows.following(username, page, size, principal);
  }

  @GetMapping("/network/me")
  @Operation(summary = "Get current user's network counts")
  @SecurityRequirement(name = "bearerAuth")
  NetworkSummaryResponse summary(@AuthenticationPrincipal AuthenticatedUser principal) {
    return follows.summary(principal);
  }
}

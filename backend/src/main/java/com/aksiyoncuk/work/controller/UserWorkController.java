package com.aksiyoncuk.work.controller;

import com.aksiyoncuk.auth.security.AuthenticatedUser;
import com.aksiyoncuk.common.response.ApiErrorResponse;
import com.aksiyoncuk.work.dto.WorkPageResponse;
import com.aksiyoncuk.work.service.WorkService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/users")
public class UserWorkController {

  private final WorkService workService;

  public UserWorkController(WorkService workService) {
    this.workService = workService;
  }

  @GetMapping("/{username}/works")
  @Operation(
      summary = "List a user's public portfolio works",
      description = "Usernames are trimmed and normalized to lowercase.")
  @ApiResponses({
    @ApiResponse(
        responseCode = "200",
        content = @Content(schema = @Schema(implementation = WorkPageResponse.class))),
    @ApiResponse(
        responseCode = "400",
        content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
    @ApiResponse(
        responseCode = "404",
        content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
  })
  WorkPageResponse byUsername(
      @PathVariable String username,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size,
      @Parameter(hidden = true) @AuthenticationPrincipal AuthenticatedUser principal) {
    return workService.publicWorks(username, page, size, principal);
  }
}

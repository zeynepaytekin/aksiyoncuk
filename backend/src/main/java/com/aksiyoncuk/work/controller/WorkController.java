package com.aksiyoncuk.work.controller;

import com.aksiyoncuk.auth.security.AuthenticatedUser;
import com.aksiyoncuk.common.response.ApiErrorResponse;
import com.aksiyoncuk.work.dto.CreateWorkRequest;
import com.aksiyoncuk.work.dto.UpdateWorkRequest;
import com.aksiyoncuk.work.dto.WorkPageResponse;
import com.aksiyoncuk.work.dto.WorkResponse;
import com.aksiyoncuk.work.service.WorkService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import java.net.URI;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/works")
public class WorkController {

  private final WorkService workService;

  public WorkController(WorkService workService) {
    this.workService = workService;
  }

  @PostMapping
  @Operation(summary = "Create a portfolio work")
  @SecurityRequirement(name = "bearerAuth")
  @ApiResponses({
    @ApiResponse(
        responseCode = "201",
        content = @Content(schema = @Schema(implementation = WorkResponse.class))),
    @ApiResponse(
        responseCode = "400",
        content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
    @ApiResponse(
        responseCode = "401",
        content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
  })
  ResponseEntity<WorkResponse> create(
      @AuthenticationPrincipal AuthenticatedUser principal,
      @RequestBody CreateWorkRequest request) {
    var response = workService.create(principal, request);
    return ResponseEntity.created(URI.create("/api/v1/works/" + response.id())).body(response);
  }

  @GetMapping("/me")
  @Operation(summary = "List the current user's portfolio works")
  @SecurityRequirement(name = "bearerAuth")
  @ApiResponses({
    @ApiResponse(
        responseCode = "200",
        content = @Content(schema = @Schema(implementation = WorkPageResponse.class))),
    @ApiResponse(
        responseCode = "400",
        content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
    @ApiResponse(
        responseCode = "401",
        content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
  })
  WorkPageResponse mine(
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size,
      @AuthenticationPrincipal AuthenticatedUser principal) {
    return workService.currentUserWorks(page, size, principal);
  }

  @GetMapping("/{workId}")
  @Operation(summary = "Get a public portfolio work")
  @ApiResponses({
    @ApiResponse(
        responseCode = "200",
        content = @Content(schema = @Schema(implementation = WorkResponse.class))),
    @ApiResponse(
        responseCode = "400",
        content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
    @ApiResponse(
        responseCode = "404",
        content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
  })
  WorkResponse find(
      @PathVariable UUID workId,
      @Parameter(hidden = true) @AuthenticationPrincipal AuthenticatedUser principal) {
    return workService.find(workId, principal);
  }

  @PatchMapping("/{workId}")
  @Operation(
      summary = "Partially update an owned work",
      description = "Omitted fields remain unchanged; null clears nullable fields.")
  @SecurityRequirement(name = "bearerAuth")
  @ApiResponses({
    @ApiResponse(
        responseCode = "200",
        content = @Content(schema = @Schema(implementation = WorkResponse.class))),
    @ApiResponse(
        responseCode = "400",
        content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
    @ApiResponse(
        responseCode = "401",
        content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
    @ApiResponse(
        responseCode = "403",
        content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
    @ApiResponse(
        responseCode = "404",
        content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
  })
  WorkResponse update(
      @PathVariable UUID workId,
      @AuthenticationPrincipal AuthenticatedUser principal,
      @RequestBody UpdateWorkRequest request) {
    return workService.update(workId, principal, request);
  }

  @DeleteMapping("/{workId}")
  @Operation(summary = "Delete an owned work")
  @SecurityRequirement(name = "bearerAuth")
  @ApiResponses({
    @ApiResponse(responseCode = "204"),
    @ApiResponse(
        responseCode = "401",
        content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
    @ApiResponse(
        responseCode = "403",
        content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
    @ApiResponse(
        responseCode = "404",
        content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
  })
  ResponseEntity<Void> delete(
      @PathVariable UUID workId, @AuthenticationPrincipal AuthenticatedUser principal) {
    workService.delete(workId, principal);
    return ResponseEntity.noContent().build();
  }
}

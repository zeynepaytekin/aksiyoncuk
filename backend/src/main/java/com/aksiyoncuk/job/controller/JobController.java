package com.aksiyoncuk.job.controller;

import com.aksiyoncuk.auth.security.AuthenticatedUser;
import com.aksiyoncuk.common.response.ApiErrorResponse;
import com.aksiyoncuk.job.dto.*;
import com.aksiyoncuk.job.service.JobService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.*;
import io.swagger.v3.oas.annotations.responses.*;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import java.net.URI;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/jobs")
public class JobController {
  private final JobService jobs;

  public JobController(JobService jobs) {
    this.jobs = jobs;
  }

  @PostMapping
  @Operation(
      summary = "Create a job listing",
      description = "Creates an OPEN listing. Compensation fields must match their type.")
  @SecurityRequirement(name = "bearerAuth")
  @ApiResponses({
    @ApiResponse(
        responseCode = "201",
        content = @Content(schema = @Schema(implementation = JobResponse.class))),
    @ApiResponse(
        responseCode = "400",
        content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
    @ApiResponse(
        responseCode = "401",
        content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
  })
  ResponseEntity<JobResponse> create(
      @AuthenticationPrincipal AuthenticatedUser principal, @RequestBody CreateJobRequest request) {
    var response = jobs.create(principal, request);
    return ResponseEntity.created(URI.create("/api/v1/jobs/" + response.id())).body(response);
  }

  @GetMapping
  @Operation(
      summary = "Browse job listings",
      description =
          "Defaults to OPEN; supports status, category, workMode, page, and size filters.")
  @ApiResponses({
    @ApiResponse(
        responseCode = "200",
        content = @Content(schema = @Schema(implementation = JobPageResponse.class))),
    @ApiResponse(
        responseCode = "400",
        content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
  })
  JobPageResponse global(
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size,
      @RequestParam(required = false) String status,
      @RequestParam(required = false) String category,
      @RequestParam(required = false) String workMode,
      @Parameter(hidden = true) @AuthenticationPrincipal AuthenticatedUser principal) {
    return jobs.global(page, size, status, category, workMode, principal);
  }

  @GetMapping("/me")
  @Operation(summary = "List the current user's jobs")
  @SecurityRequirement(name = "bearerAuth")
  @ApiResponses({
    @ApiResponse(
        responseCode = "200",
        content = @Content(schema = @Schema(implementation = JobPageResponse.class))),
    @ApiResponse(responseCode = "400"),
    @ApiResponse(responseCode = "401")
  })
  JobPageResponse mine(
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size,
      @RequestParam(required = false) String status,
      @AuthenticationPrincipal AuthenticatedUser principal) {
    return jobs.mine(page, size, status, principal);
  }

  @GetMapping("/{jobId}")
  @Operation(summary = "Get a public job listing")
  @ApiResponses({
    @ApiResponse(responseCode = "200"),
    @ApiResponse(responseCode = "400"),
    @ApiResponse(responseCode = "404")
  })
  JobResponse find(
      @PathVariable UUID jobId,
      @Parameter(hidden = true) @AuthenticationPrincipal AuthenticatedUser principal) {
    return jobs.find(jobId, principal);
  }

  @PatchMapping("/{jobId}")
  @Operation(
      summary = "Partially update an owned job",
      description = "Omitted fields remain unchanged; null clears nullable fields.")
  @SecurityRequirement(name = "bearerAuth")
  @ApiResponses({
    @ApiResponse(responseCode = "200"),
    @ApiResponse(responseCode = "400"),
    @ApiResponse(responseCode = "401"),
    @ApiResponse(responseCode = "403"),
    @ApiResponse(responseCode = "404")
  })
  JobResponse update(
      @PathVariable UUID jobId,
      @AuthenticationPrincipal AuthenticatedUser principal,
      @RequestBody UpdateJobRequest request) {
    return jobs.update(jobId, principal, request);
  }

  @PostMapping("/{jobId}/close")
  @Operation(summary = "Close an owned job", description = "Idempotently sets status to CLOSED.")
  @SecurityRequirement(name = "bearerAuth")
  @ApiResponses({
    @ApiResponse(responseCode = "200"),
    @ApiResponse(responseCode = "401"),
    @ApiResponse(responseCode = "403"),
    @ApiResponse(responseCode = "404")
  })
  JobResponse close(
      @PathVariable UUID jobId, @AuthenticationPrincipal AuthenticatedUser principal) {
    return jobs.close(jobId, principal);
  }

  @PostMapping("/{jobId}/reopen")
  @Operation(summary = "Reopen an owned job", description = "Idempotently sets status to OPEN.")
  @SecurityRequirement(name = "bearerAuth")
  @ApiResponses({
    @ApiResponse(responseCode = "200"),
    @ApiResponse(responseCode = "401"),
    @ApiResponse(responseCode = "403"),
    @ApiResponse(responseCode = "404")
  })
  JobResponse reopen(
      @PathVariable UUID jobId, @AuthenticationPrincipal AuthenticatedUser principal) {
    return jobs.reopen(jobId, principal);
  }

  @DeleteMapping("/{jobId}")
  @Operation(summary = "Delete an owned job")
  @SecurityRequirement(name = "bearerAuth")
  @ApiResponses({
    @ApiResponse(responseCode = "204"),
    @ApiResponse(responseCode = "401"),
    @ApiResponse(responseCode = "403"),
    @ApiResponse(responseCode = "404")
  })
  ResponseEntity<Void> delete(
      @PathVariable UUID jobId, @AuthenticationPrincipal AuthenticatedUser principal) {
    jobs.delete(jobId, principal);
    return ResponseEntity.noContent().build();
  }
}

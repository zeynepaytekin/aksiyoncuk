package com.aksiyoncuk.job.application.controller;

import com.aksiyoncuk.auth.security.AuthenticatedUser;
import com.aksiyoncuk.job.application.dto.*;
import com.aksiyoncuk.job.application.service.JobApplicationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.*;
import io.swagger.v3.oas.annotations.responses.*;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import java.net.URI;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@SecurityRequirement(name = "bearerAuth")
public class JobApplicationController {
  private final JobApplicationService service;

  public JobApplicationController(JobApplicationService service) {
    this.service = service;
  }

  @PostMapping("/api/v1/jobs/{jobId}/applications")
  @Operation(
      summary = "Apply to an open job",
      description = "Creates one SUBMITTED application per applicant and job.")
  @ApiResponses({
    @ApiResponse(
        responseCode = "201",
        content = @Content(schema = @Schema(implementation = JobApplicationResponse.class))),
    @ApiResponse(responseCode = "400"),
    @ApiResponse(responseCode = "401"),
    @ApiResponse(responseCode = "404"),
    @ApiResponse(responseCode = "409")
  })
  ResponseEntity<JobApplicationResponse> apply(
      @PathVariable UUID jobId,
      @AuthenticationPrincipal AuthenticatedUser principal,
      @RequestBody CreateJobApplicationRequest request) {
    var response = service.apply(jobId, principal, request);
    return ResponseEntity.created(URI.create("/api/v1/job-applications/" + response.id()))
        .body(response);
  }

  @GetMapping("/api/v1/job-applications/me")
  @Operation(summary = "List the current applicant's applications")
  JobApplicationPageResponse mine(
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size,
      @RequestParam(required = false) String status,
      @AuthenticationPrincipal AuthenticatedUser principal) {
    return service.mine(page, size, status, principal);
  }

  @GetMapping("/api/v1/jobs/{jobId}/applications")
  @Operation(summary = "List applications for an owned job")
  JobApplicationPageResponse forJob(
      @PathVariable UUID jobId,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size,
      @RequestParam(required = false) String status,
      @AuthenticationPrincipal AuthenticatedUser principal) {
    return service.forJob(jobId, page, size, status, principal);
  }

  @GetMapping("/api/v1/job-applications/{applicationId}")
  @Operation(summary = "Get an application as its applicant or job owner")
  JobApplicationResponse find(
      @PathVariable UUID applicationId, @AuthenticationPrincipal AuthenticatedUser principal) {
    return service.find(applicationId, principal);
  }

  @PostMapping("/api/v1/job-applications/{applicationId}/withdraw")
  @Operation(
      summary = "Withdraw a submitted application",
      description = "WITHDRAWN is terminal; repeated withdrawal is idempotent.")
  JobApplicationResponse withdraw(
      @PathVariable UUID applicationId, @AuthenticationPrincipal AuthenticatedUser principal) {
    return service.withdraw(applicationId, principal);
  }

  @PostMapping("/api/v1/job-applications/{applicationId}/accept")
  @Operation(
      summary = "Accept a submitted application",
      description = "Only the job owner may accept; repeated acceptance is idempotent.")
  JobApplicationResponse accept(
      @PathVariable UUID applicationId, @AuthenticationPrincipal AuthenticatedUser principal) {
    return service.accept(applicationId, principal);
  }

  @PostMapping("/api/v1/job-applications/{applicationId}/reject")
  @Operation(
      summary = "Reject a submitted application",
      description = "Only the job owner may reject; repeated rejection is idempotent.")
  JobApplicationResponse reject(
      @PathVariable UUID applicationId, @AuthenticationPrincipal AuthenticatedUser principal) {
    return service.reject(applicationId, principal);
  }
}

package com.aksiyoncuk.search.controller;

import com.aksiyoncuk.auth.security.AuthenticatedUser;
import com.aksiyoncuk.common.response.ApiErrorResponse;
import com.aksiyoncuk.job.dto.JobResponse;
import com.aksiyoncuk.post.dto.PostResponse;
import com.aksiyoncuk.search.dto.CombinedSearchResponse;
import com.aksiyoncuk.search.dto.SearchPageResponse;
import com.aksiyoncuk.search.dto.SearchUserResponse;
import com.aksiyoncuk.search.service.SearchService;
import com.aksiyoncuk.work.dto.WorkResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/search")
public class SearchController {

  private final SearchService searchService;

  public SearchController(SearchService searchService) {
    this.searchService = searchService;
  }

  @GetMapping
  @Operation(
      summary = "Search all public resource types",
      description =
          "Returns bounded groups using each resource's ranking and optional viewer state.")
  @ApiResponses({
    @ApiResponse(responseCode = "200"),
    @ApiResponse(
        responseCode = "400",
        content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
  })
  CombinedSearchResponse combined(
      @RequestParam String q,
      @RequestParam(defaultValue = "5") int limitPerType,
      @AuthenticationPrincipal AuthenticatedUser principal) {
    return searchService.combined(q, limitPerType, principal);
  }

  @GetMapping("/users")
  @Operation(summary = "Search public users")
  SearchPageResponse<SearchUserResponse> users(
      @RequestParam String q,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size,
      @AuthenticationPrincipal AuthenticatedUser principal) {
    return searchService.users(q, page, size, principal);
  }

  @GetMapping("/posts")
  @Operation(summary = "Search public posts")
  SearchPageResponse<PostResponse> posts(
      @RequestParam String q,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size,
      @RequestParam(required = false) String authorUsername,
      @AuthenticationPrincipal AuthenticatedUser principal) {
    return searchService.posts(q, page, size, authorUsername, principal);
  }

  @GetMapping("/works")
  @Operation(summary = "Search public portfolio works")
  SearchPageResponse<WorkResponse> works(
      @RequestParam String q,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size,
      @RequestParam(required = false) String workType,
      @RequestParam(required = false) String ownerUsername,
      @RequestParam(required = false) Integer releaseYear,
      @AuthenticationPrincipal AuthenticatedUser principal) {
    return searchService.works(q, page, size, workType, ownerUsername, releaseYear, principal);
  }

  @GetMapping("/jobs")
  @Operation(
      summary = "Search public jobs",
      description = "Defaults to OPEN jobs when status is omitted.")
  SearchPageResponse<JobResponse> jobs(
      @RequestParam String q,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size,
      @RequestParam(required = false) String category,
      @RequestParam(required = false) String workMode,
      @RequestParam(required = false) String status,
      @RequestParam(required = false) String compensationType,
      @RequestParam(required = false) String ownerUsername,
      @AuthenticationPrincipal AuthenticatedUser principal) {
    return searchService.jobs(
        q, page, size, category, workMode, status, compensationType, ownerUsername, principal);
  }
}

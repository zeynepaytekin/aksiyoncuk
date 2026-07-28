package com.aksiyoncuk.post.controller;

import com.aksiyoncuk.auth.security.AuthenticatedUser;
import com.aksiyoncuk.common.response.ApiErrorResponse;
import com.aksiyoncuk.post.dto.CreatePostRequest;
import com.aksiyoncuk.post.dto.PostPageResponse;
import com.aksiyoncuk.post.dto.PostResponse;
import com.aksiyoncuk.post.service.PostService;
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
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/posts")
public class PostController {

  private final PostService postService;

  public PostController(PostService postService) {
    this.postService = postService;
  }

  @PostMapping
  @Operation(summary = "Create a post")
  @SecurityRequirement(name = "bearerAuth")
  @ApiResponses({
    @ApiResponse(
        responseCode = "201",
        content = @Content(schema = @Schema(implementation = PostResponse.class))),
    @ApiResponse(
        responseCode = "400",
        content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
    @ApiResponse(
        responseCode = "401",
        content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
  })
  ResponseEntity<PostResponse> create(
      @AuthenticationPrincipal AuthenticatedUser principal,
      @RequestBody CreatePostRequest request) {
    var response = postService.create(principal, request);
    return ResponseEntity.created(URI.create("/api/v1/posts/" + response.id())).body(response);
  }

  @GetMapping
  @Operation(summary = "Get the public global feed")
  @ApiResponse(
      responseCode = "200",
      content = @Content(schema = @Schema(implementation = PostPageResponse.class)))
  PostPageResponse globalFeed(
      @RequestParam(defaultValue = "0") @Parameter(description = "Zero-based page") int page,
      @RequestParam(defaultValue = "20") @Parameter(description = "Page size from 1 to 50")
          int size,
      @AuthenticationPrincipal AuthenticatedUser principal) {
    return postService.globalFeed(page, size, principal);
  }

  @GetMapping("/me")
  @Operation(summary = "Get the authenticated user's posts")
  @SecurityRequirement(name = "bearerAuth")
  @ApiResponses({
    @ApiResponse(
        responseCode = "200",
        content = @Content(schema = @Schema(implementation = PostPageResponse.class))),
    @ApiResponse(
        responseCode = "400",
        content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
    @ApiResponse(
        responseCode = "401",
        content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
  })
  PostPageResponse currentUserFeed(
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size,
      @AuthenticationPrincipal AuthenticatedUser principal) {
    return postService.currentUserFeed(page, size, principal);
  }

  @GetMapping("/{postId}")
  @Operation(summary = "Get a single public post")
  @ApiResponses({
    @ApiResponse(
        responseCode = "200",
        content = @Content(schema = @Schema(implementation = PostResponse.class))),
    @ApiResponse(
        responseCode = "400",
        content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
    @ApiResponse(
        responseCode = "404",
        content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
  })
  PostResponse find(
      @PathVariable UUID postId, @AuthenticationPrincipal AuthenticatedUser principal) {
    return postService.find(postId, principal);
  }

  @DeleteMapping("/{postId}")
  @Operation(summary = "Delete a post owned by the authenticated user")
  @SecurityRequirement(name = "bearerAuth")
  @ApiResponses({
    @ApiResponse(responseCode = "204", description = "Post deleted"),
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
  ResponseEntity<Void> delete(
      @PathVariable UUID postId, @AuthenticationPrincipal AuthenticatedUser principal) {
    postService.delete(postId, principal);
    return ResponseEntity.noContent().build();
  }
}

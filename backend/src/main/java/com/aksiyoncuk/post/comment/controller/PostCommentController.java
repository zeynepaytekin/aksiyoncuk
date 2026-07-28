package com.aksiyoncuk.post.comment.controller;

import com.aksiyoncuk.auth.security.AuthenticatedUser;
import com.aksiyoncuk.common.response.ApiErrorResponse;
import com.aksiyoncuk.post.comment.dto.CommentPageResponse;
import com.aksiyoncuk.post.comment.dto.CommentResponse;
import com.aksiyoncuk.post.comment.dto.CreateCommentRequest;
import com.aksiyoncuk.post.comment.service.PostCommentService;
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
@RequestMapping("/api/v1")
public class PostCommentController {

  private final PostCommentService commentService;

  public PostCommentController(PostCommentService commentService) {
    this.commentService = commentService;
  }

  @PostMapping("/posts/{postId}/comments")
  @Operation(summary = "Create a comment on a post")
  @SecurityRequirement(name = "bearerAuth")
  @ApiResponses({
    @ApiResponse(
        responseCode = "201",
        content = @Content(schema = @Schema(implementation = CommentResponse.class))),
    @ApiResponse(
        responseCode = "400",
        content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
    @ApiResponse(
        responseCode = "401",
        content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
    @ApiResponse(
        responseCode = "404",
        content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
  })
  ResponseEntity<CommentResponse> create(
      @PathVariable UUID postId,
      @AuthenticationPrincipal AuthenticatedUser principal,
      @RequestBody CreateCommentRequest request) {
    var response = commentService.create(postId, principal, request);
    return ResponseEntity.created(URI.create("/api/v1/comments/" + response.id())).body(response);
  }

  @GetMapping("/posts/{postId}/comments")
  @Operation(summary = "List a post's comments in oldest-first order")
  @ApiResponses({
    @ApiResponse(
        responseCode = "200",
        content = @Content(schema = @Schema(implementation = CommentPageResponse.class))),
    @ApiResponse(
        responseCode = "400",
        content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
    @ApiResponse(
        responseCode = "404",
        content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
  })
  CommentPageResponse list(
      @PathVariable UUID postId,
      @RequestParam(defaultValue = "0") @Parameter(description = "Zero-based page") int page,
      @RequestParam(defaultValue = "20") @Parameter(description = "Page size from 1 to 50")
          int size,
      @AuthenticationPrincipal AuthenticatedUser principal) {
    return commentService.list(postId, page, size, principal);
  }

  @DeleteMapping("/comments/{commentId}")
  @Operation(summary = "Delete a comment owned by the authenticated user")
  @SecurityRequirement(name = "bearerAuth")
  @ApiResponses({
    @ApiResponse(responseCode = "204", description = "Comment deleted"),
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
      @PathVariable UUID commentId, @AuthenticationPrincipal AuthenticatedUser principal) {
    commentService.delete(commentId, principal);
    return ResponseEntity.noContent().build();
  }
}

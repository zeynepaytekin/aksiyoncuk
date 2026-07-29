package com.aksiyoncuk.media.controller;

import com.aksiyoncuk.auth.security.AuthenticatedUser;
import com.aksiyoncuk.media.dto.MediaAssetResponse;
import com.aksiyoncuk.media.dto.MediaListItemResponse;
import com.aksiyoncuk.media.dto.MediaOrderRequest;
import com.aksiyoncuk.media.service.MediaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.parameters.RequestBody;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import java.net.URI;
import java.util.List;
import java.util.UUID;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@SecurityRequirement(name = "bearerAuth")
public class MediaController {
  private final MediaService media;

  public MediaController(MediaService media) {
    this.media = media;
  }

  @Operation(
      summary = "Upload or replace the current user's avatar",
      description =
          "JPEG, PNG, or WebP; maximum 5 MB. Replaces the prior avatar and schedules its object for cleanup.")
  @ApiResponse(responseCode = "201", description = "Avatar created")
  @PostMapping(
      path = "/api/v1/media/profile/avatar",
      consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  ResponseEntity<MediaAssetResponse> avatar(
      @AuthenticationPrincipal AuthenticatedUser principal,
      @RequestPart("file")
          @RequestBody(
              content =
                  @Content(
                      mediaType = MediaType.APPLICATION_OCTET_STREAM_VALUE,
                      schema = @Schema(type = "string", format = "binary")))
          MultipartFile file) {
    return created(media.uploadAvatar(principal, file));
  }

  @Operation(
      summary = "Upload or replace the current user's cover",
      description = "JPEG, PNG, or WebP; maximum 10 MB.")
  @PostMapping(path = "/api/v1/media/profile/cover", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  ResponseEntity<MediaAssetResponse> cover(
      @AuthenticationPrincipal AuthenticatedUser principal,
      @RequestPart("file") MultipartFile file) {
    return created(media.uploadCover(principal, file));
  }

  @PostMapping(
      path = "/api/v1/posts/{postId}/media",
      consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  ResponseEntity<MediaAssetResponse> post(
      @PathVariable UUID postId,
      @AuthenticationPrincipal AuthenticatedUser principal,
      @RequestPart("file") MultipartFile file) {
    return created(media.uploadPost(postId, principal, file));
  }

  @PostMapping(
      path = "/api/v1/works/{workId}/media",
      consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  ResponseEntity<MediaAssetResponse> work(
      @PathVariable UUID workId,
      @AuthenticationPrincipal AuthenticatedUser principal,
      @RequestPart("file") MultipartFile file) {
    return created(media.uploadWork(workId, principal, file));
  }

  @DeleteMapping("/api/v1/media/profile/avatar")
  ResponseEntity<Void> deleteAvatar(@AuthenticationPrincipal AuthenticatedUser principal) {
    media.deleteAvatar(principal);
    return ResponseEntity.noContent().build();
  }

  @DeleteMapping("/api/v1/media/profile/cover")
  ResponseEntity<Void> deleteCover(@AuthenticationPrincipal AuthenticatedUser principal) {
    media.deleteCover(principal);
    return ResponseEntity.noContent().build();
  }

  @DeleteMapping("/api/v1/posts/{postId}/media/{mediaId}")
  ResponseEntity<Void> deletePost(
      @PathVariable UUID postId,
      @PathVariable UUID mediaId,
      @AuthenticationPrincipal AuthenticatedUser principal) {
    media.deletePost(postId, mediaId, principal);
    return ResponseEntity.noContent().build();
  }

  @DeleteMapping("/api/v1/works/{workId}/media/{mediaId}")
  ResponseEntity<Void> deleteWork(
      @PathVariable UUID workId,
      @PathVariable UUID mediaId,
      @AuthenticationPrincipal AuthenticatedUser principal) {
    media.deleteWork(workId, mediaId, principal);
    return ResponseEntity.noContent().build();
  }

  @PutMapping("/api/v1/posts/{postId}/media/order")
  List<MediaListItemResponse> reorderPost(
      @PathVariable UUID postId,
      @AuthenticationPrincipal AuthenticatedUser principal,
      @org.springframework.web.bind.annotation.RequestBody MediaOrderRequest request) {
    return media.reorderPost(postId, principal, request);
  }

  @PutMapping("/api/v1/works/{workId}/media/order")
  List<MediaListItemResponse> reorderWork(
      @PathVariable UUID workId,
      @AuthenticationPrincipal AuthenticatedUser principal,
      @org.springframework.web.bind.annotation.RequestBody MediaOrderRequest request) {
    return media.reorderWork(workId, principal, request);
  }

  private ResponseEntity<MediaAssetResponse> created(MediaAssetResponse response) {
    return ResponseEntity.created(URI.create("/api/v1/media/" + response.id())).body(response);
  }
}

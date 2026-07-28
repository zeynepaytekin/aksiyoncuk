package com.aksiyoncuk.messaging.controller;

import com.aksiyoncuk.auth.security.AuthenticatedUser;
import com.aksiyoncuk.common.response.ApiErrorResponse;
import com.aksiyoncuk.messaging.dto.*;
import com.aksiyoncuk.messaging.service.MessagingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import java.net.URI;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
@SecurityRequirement(name = "bearerAuth")
public class MessagingController {
  private final MessagingService messaging;

  public MessagingController(MessagingService messaging) {
    this.messaging = messaging;
  }

  @PostMapping("/conversations")
  @Operation(summary = "Start or reuse a direct conversation")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "Existing conversation returned"),
    @ApiResponse(responseCode = "201", description = "Conversation created"),
    @ApiResponse(
        responseCode = "400",
        content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
    @ApiResponse(responseCode = "401")
  })
  ResponseEntity<ConversationResponse> start(
      @AuthenticationPrincipal AuthenticatedUser principal,
      @RequestBody StartConversationRequest request) {
    var result = messaging.start(principal, request);
    if (result.created()) {
      return ResponseEntity.created(
              URI.create("/api/v1/conversations/" + result.conversation().id()))
          .body(result.conversation());
    }
    return ResponseEntity.ok(result.conversation());
  }

  @GetMapping("/conversations")
  @Operation(summary = "List current user's direct conversations")
  ConversationPageResponse list(
      @AuthenticationPrincipal AuthenticatedUser principal,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size) {
    return messaging.list(principal, page, size);
  }

  @GetMapping("/conversations/{conversationId}")
  @Operation(summary = "Get one participant conversation")
  ConversationResponse get(
      @PathVariable UUID conversationId, @AuthenticationPrincipal AuthenticatedUser principal) {
    return messaging.get(conversationId, principal);
  }

  @PostMapping("/conversations/{conversationId}/messages")
  @Operation(summary = "Send a text message")
  ResponseEntity<MessageResponse> send(
      @PathVariable UUID conversationId,
      @AuthenticationPrincipal AuthenticatedUser principal,
      @RequestBody SendMessageRequest request) {
    var response = messaging.send(conversationId, principal, request);
    return ResponseEntity.created(
            URI.create("/api/v1/conversations/" + conversationId + "/messages/" + response.id()))
        .body(response);
  }

  @GetMapping("/conversations/{conversationId}/messages")
  @Operation(
      summary = "List conversation messages",
      description = "Messages are newest first; clients may reverse a page for display.")
  MessagePageResponse messages(
      @PathVariable UUID conversationId,
      @AuthenticationPrincipal AuthenticatedUser principal,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "30") int size) {
    return messaging.messages(conversationId, principal, page, size);
  }

  @PostMapping("/conversations/{conversationId}/read")
  @Operation(summary = "Mark the current participant's conversation read")
  ConversationResponse markRead(
      @PathVariable UUID conversationId, @AuthenticationPrincipal AuthenticatedUser principal) {
    return messaging.markRead(conversationId, principal);
  }

  @GetMapping("/messaging/summary")
  @Operation(summary = "Get unread messaging totals")
  MessagingSummaryResponse summary(@AuthenticationPrincipal AuthenticatedUser principal) {
    return messaging.summary(principal);
  }
}

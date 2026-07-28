package com.aksiyoncuk.notification.controller;

import com.aksiyoncuk.auth.security.AuthenticatedUser;
import com.aksiyoncuk.common.response.ApiErrorResponse;
import com.aksiyoncuk.notification.dto.*;
import com.aksiyoncuk.notification.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/notifications")
@SecurityRequirement(name = "bearerAuth")
public class NotificationController {
  private final NotificationService notifications;

  public NotificationController(NotificationService notifications) {
    this.notifications = notifications;
  }

  @GetMapping
  @Operation(summary = "List current user's notifications")
  @ApiResponses({
    @ApiResponse(
        responseCode = "200",
        content = @Content(schema = @Schema(implementation = NotificationPageResponse.class))),
    @ApiResponse(
        responseCode = "400",
        content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
    @ApiResponse(responseCode = "401")
  })
  NotificationPageResponse list(
      @AuthenticationPrincipal AuthenticatedUser principal,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size,
      @RequestParam(defaultValue = "false") boolean unreadOnly,
      @RequestParam(required = false) String type) {
    return notifications.list(principal, page, size, unreadOnly, type);
  }

  @GetMapping("/summary")
  @Operation(summary = "Get unread notification count")
  NotificationSummaryResponse summary(@AuthenticationPrincipal AuthenticatedUser principal) {
    return notifications.summary(principal);
  }

  @PostMapping("/{notificationId}/read")
  @Operation(summary = "Mark one notification read")
  NotificationResponse markRead(
      @PathVariable UUID notificationId, @AuthenticationPrincipal AuthenticatedUser principal) {
    return notifications.markRead(notificationId, principal);
  }

  @PostMapping("/{notificationId}/unread")
  @Operation(summary = "Mark one notification unread")
  NotificationResponse markUnread(
      @PathVariable UUID notificationId, @AuthenticationPrincipal AuthenticatedUser principal) {
    return notifications.markUnread(notificationId, principal);
  }

  @PostMapping("/read-all")
  @Operation(summary = "Mark every current-user notification read")
  NotificationSummaryResponse markAllRead(@AuthenticationPrincipal AuthenticatedUser principal) {
    return notifications.markAllRead(principal);
  }
}

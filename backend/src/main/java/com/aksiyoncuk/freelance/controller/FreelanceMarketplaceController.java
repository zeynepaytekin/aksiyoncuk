package com.aksiyoncuk.freelance.controller;

import static com.aksiyoncuk.freelance.dto.FreelanceDtos.*;

import com.aksiyoncuk.auth.security.AuthenticatedUser;
import com.aksiyoncuk.freelance.service.FreelanceMarketplaceService;
import com.aksiyoncuk.messaging.dto.ConversationResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import java.math.BigDecimal;
import java.net.URI;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/freelance")
public class FreelanceMarketplaceController {
  private final FreelanceMarketplaceService marketplace;

  public FreelanceMarketplaceController(FreelanceMarketplaceService marketplace) {
    this.marketplace = marketplace;
  }

  @GetMapping("/categories")
  @Operation(summary = "List active freelance categories")
  List<Category> categories() {
    return marketplace.categories();
  }

  @GetMapping("/categories/{slug}")
  @Operation(summary = "Get an active freelance category")
  Category category(@PathVariable String slug) {
    return marketplace.category(slug);
  }

  @PostMapping("/services")
  @SecurityRequirement(name = "bearerAuth")
  @Operation(
      summary = "Create a draft freelance listing",
      description = "Packages are replaced transactionally; prices are TRY monetary values.")
  ResponseEntity<ServiceResponse> createService(
      @AuthenticationPrincipal AuthenticatedUser principal, @RequestBody ServiceRequest request) {
    var result = marketplace.create(principal, request);
    return ResponseEntity.created(URI.create("/api/v1/freelance/services/" + result.id()))
        .body(result);
  }

  @PutMapping("/services/{serviceId}")
  @SecurityRequirement(name = "bearerAuth")
  @Operation(summary = "Replace an owned listing and its package set")
  ServiceResponse updateService(
      @PathVariable UUID serviceId,
      @AuthenticationPrincipal AuthenticatedUser principal,
      @RequestBody ServiceRequest request) {
    return marketplace.update(serviceId, principal, request);
  }

  @PostMapping("/services/{serviceId}/publish")
  @SecurityRequirement(name = "bearerAuth")
  @Operation(summary = "Publish a complete owned listing")
  ServiceResponse publish(
      @PathVariable UUID serviceId, @AuthenticationPrincipal AuthenticatedUser principal) {
    return marketplace.publish(serviceId, principal);
  }

  @PostMapping("/services/{serviceId}/pause")
  @SecurityRequirement(name = "bearerAuth")
  ServiceResponse pause(
      @PathVariable UUID serviceId, @AuthenticationPrincipal AuthenticatedUser principal) {
    return marketplace.pause(serviceId, principal);
  }

  @PostMapping("/services/{serviceId}/archive")
  @SecurityRequirement(name = "bearerAuth")
  ServiceResponse archive(
      @PathVariable UUID serviceId, @AuthenticationPrincipal AuthenticatedUser principal) {
    return marketplace.archive(serviceId, principal);
  }

  @GetMapping("/services/mine")
  @SecurityRequirement(name = "bearerAuth")
  Page<OwnedServiceSummary> mine(
      @AuthenticationPrincipal AuthenticatedUser principal,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size) {
    return marketplace.mine(principal, page, size);
  }

  @GetMapping("/services/{serviceId}")
  ServiceResponse service(
      @PathVariable UUID serviceId, @AuthenticationPrincipal AuthenticatedUser principal) {
    return marketplace.detail(serviceId, principal);
  }

  @GetMapping("/services")
  @Operation(
      summary = "Search published freelance listings",
      description =
          "Supports q, category slug, seller username, price, delivery, rating, tier and deterministic sorting.")
  Page<ServiceSummary> search(
      @RequestParam(required = false) String q,
      @RequestParam(required = false) String category,
      @RequestParam(required = false) String seller,
      @RequestParam(required = false) BigDecimal minPrice,
      @RequestParam(required = false) BigDecimal maxPrice,
      @RequestParam(required = false) Integer deliveryDaysMax,
      @RequestParam(required = false) BigDecimal minimumRating,
      @RequestParam(required = false) String packageTier,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size,
      @RequestParam(defaultValue = "NEWEST") String sort) {
    return marketplace.search(
        q,
        category,
        seller,
        minPrice,
        maxPrice,
        deliveryDaysMax,
        minimumRating,
        packageTier,
        page,
        size,
        sort);
  }

  @PostMapping("/services/{serviceId}/conversation")
  @SecurityRequirement(name = "bearerAuth")
  @Operation(
      summary = "Create or reuse a direct conversation with the seller",
      description = "No message is sent automatically.")
  ConversationResponse conversation(
      @PathVariable UUID serviceId, @AuthenticationPrincipal AuthenticatedUser principal) {
    return marketplace.conversation(serviceId, principal).conversation();
  }

  @PostMapping("/orders")
  @SecurityRequirement(name = "bearerAuth")
  @Operation(
      summary = "Create an unpaid Phase 1 order",
      description =
          "Package price and terms are snapshotted server-side. CREATED does not mean paid.")
  ResponseEntity<OrderResponse> createOrder(
      @AuthenticationPrincipal AuthenticatedUser principal,
      @RequestBody OrderCreateRequest request) {
    var result = marketplace.createOrder(principal, request);
    return ResponseEntity.created(URI.create("/api/v1/freelance/orders/" + result.id()))
        .body(result);
  }

  @GetMapping("/orders/{orderId}")
  @SecurityRequirement(name = "bearerAuth")
  OrderResponse order(
      @PathVariable UUID orderId, @AuthenticationPrincipal AuthenticatedUser principal) {
    return marketplace.order(orderId, principal);
  }

  @GetMapping("/orders/buying")
  @SecurityRequirement(name = "bearerAuth")
  Page<OrderResponse> buying(
      @AuthenticationPrincipal AuthenticatedUser principal,
      @RequestParam(required = false) String status,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size) {
    return marketplace.orders(principal, true, status, page, size);
  }

  @GetMapping("/orders/selling")
  @SecurityRequirement(name = "bearerAuth")
  Page<OrderResponse> selling(
      @AuthenticationPrincipal AuthenticatedUser principal,
      @RequestParam(required = false) String status,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size) {
    return marketplace.orders(principal, false, status, page, size);
  }

  @PostMapping("/orders/{orderId}/start")
  @SecurityRequirement(name = "bearerAuth")
  OrderResponse start(
      @PathVariable UUID orderId, @AuthenticationPrincipal AuthenticatedUser principal) {
    return marketplace.start(orderId, principal);
  }

  @PostMapping("/orders/{orderId}/reject")
  @SecurityRequirement(name = "bearerAuth")
  OrderResponse reject(
      @PathVariable UUID orderId,
      @AuthenticationPrincipal AuthenticatedUser principal,
      @RequestBody ReasonRequest request) {
    return marketplace.reject(orderId, principal, request);
  }

  @PostMapping("/orders/{orderId}/deliver")
  @SecurityRequirement(name = "bearerAuth")
  OrderResponse deliver(
      @PathVariable UUID orderId,
      @AuthenticationPrincipal AuthenticatedUser principal,
      @RequestBody DeliveryRequest request) {
    return marketplace.deliver(orderId, principal, request);
  }

  @PostMapping("/orders/{orderId}/revisions")
  @SecurityRequirement(name = "bearerAuth")
  OrderResponse revision(
      @PathVariable UUID orderId,
      @AuthenticationPrincipal AuthenticatedUser principal,
      @RequestBody ReasonRequest request) {
    return marketplace.requestRevision(orderId, principal, request);
  }

  @PostMapping("/orders/{orderId}/revisions/{revisionId}/acknowledge")
  @SecurityRequirement(name = "bearerAuth")
  OrderResponse acknowledge(
      @PathVariable UUID orderId,
      @PathVariable UUID revisionId,
      @AuthenticationPrincipal AuthenticatedUser principal) {
    return marketplace.acknowledgeRevision(orderId, revisionId, principal);
  }

  @PostMapping("/orders/{orderId}/complete")
  @SecurityRequirement(name = "bearerAuth")
  OrderResponse complete(
      @PathVariable UUID orderId, @AuthenticationPrincipal AuthenticatedUser principal) {
    return marketplace.complete(orderId, principal);
  }

  @PostMapping("/orders/{orderId}/cancellation-requests")
  @SecurityRequirement(name = "bearerAuth")
  OrderResponse cancel(
      @PathVariable UUID orderId,
      @AuthenticationPrincipal AuthenticatedUser principal,
      @RequestBody ReasonRequest request) {
    return marketplace.requestCancellation(orderId, principal, request);
  }

  @PostMapping("/orders/{orderId}/cancellation-requests/{requestId}/accept")
  @SecurityRequirement(name = "bearerAuth")
  OrderResponse acceptCancellation(
      @PathVariable UUID orderId,
      @PathVariable UUID requestId,
      @AuthenticationPrincipal AuthenticatedUser principal) {
    return marketplace.resolveCancellation(orderId, requestId, principal, "ACCEPTED");
  }

  @PostMapping("/orders/{orderId}/cancellation-requests/{requestId}/reject")
  @SecurityRequirement(name = "bearerAuth")
  OrderResponse rejectCancellation(
      @PathVariable UUID orderId,
      @PathVariable UUID requestId,
      @AuthenticationPrincipal AuthenticatedUser principal) {
    return marketplace.resolveCancellation(orderId, requestId, principal, "REJECTED");
  }

  @PostMapping("/orders/{orderId}/cancellation-requests/{requestId}/withdraw")
  @SecurityRequirement(name = "bearerAuth")
  OrderResponse withdrawCancellation(
      @PathVariable UUID orderId,
      @PathVariable UUID requestId,
      @AuthenticationPrincipal AuthenticatedUser principal) {
    return marketplace.resolveCancellation(orderId, requestId, principal, "WITHDRAWN");
  }

  @PostMapping("/orders/{orderId}/review")
  @SecurityRequirement(name = "bearerAuth")
  ResponseEntity<ReviewResponse> review(
      @PathVariable UUID orderId,
      @AuthenticationPrincipal AuthenticatedUser principal,
      @RequestBody ReviewRequest request) {
    var result = marketplace.review(orderId, principal, request);
    return ResponseEntity.status(201).body(result);
  }

  @GetMapping("/services/{serviceId}/reviews")
  Page<ReviewResponse> reviews(
      @PathVariable UUID serviceId,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size) {
    return marketplace.reviews(serviceId, page, size);
  }
}

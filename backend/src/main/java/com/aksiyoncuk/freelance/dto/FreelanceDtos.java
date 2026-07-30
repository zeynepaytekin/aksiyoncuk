package com.aksiyoncuk.freelance.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class FreelanceDtos {
  private FreelanceDtos() {}

  public record Category(
      UUID id,
      UUID parentId,
      String slug,
      String name,
      String description,
      int displayOrder,
      List<Category> children) {}

  public record PackageRequest(
      String tier,
      String name,
      String description,
      BigDecimal priceAmount,
      String currencyCode,
      Integer deliveryDays,
      Integer revisionCount,
      Boolean active) {}

  public record ServiceRequest(
      UUID categoryId,
      String title,
      String shortDescription,
      String description,
      String languageCode,
      List<PackageRequest> packages,
      List<UUID> workIds) {}

  public record UserSummary(
      UUID id, String username, String fullName, String professionalTitle, String avatarUrl) {}

  public record PackageResponse(
      UUID id,
      String tier,
      String name,
      String description,
      BigDecimal priceAmount,
      String currencyCode,
      int deliveryDays,
      int revisionCount,
      boolean active,
      int displayOrder) {}

  public record MediaResponse(
      UUID id, String url, String contentType, Long sizeBytes, int displayOrder) {}

  public record WorkReference(UUID id, String title, int displayOrder) {}

  public record ServiceResponse(
      UUID id,
      String slug,
      String title,
      String shortDescription,
      String description,
      String status,
      String languageCode,
      Category category,
      UserSummary seller,
      List<PackageResponse> packages,
      List<WorkReference> works,
      List<MediaResponse> media,
      BigDecimal averageRating,
      int reviewCount,
      int orderCount,
      Instant publishedAt,
      Instant createdAt,
      Instant updatedAt) {}

  public record ServiceSummary(
      UUID id,
      String slug,
      String title,
      String shortDescription,
      Category category,
      UserSummary seller,
      String thumbnailUrl,
      BigDecimal lowestPrice,
      String currencyCode,
      Integer shortestDeliveryDays,
      BigDecimal averageRating,
      int reviewCount,
      int orderCount,
      Instant publishedAt) {}

  public record Page<T>(
      List<T> content,
      int page,
      int size,
      long totalElements,
      int totalPages,
      boolean first,
      boolean last) {}

  public record WorkOrderRequest(List<UUID> workIds) {}

  public record MediaOrderRequest(List<UUID> mediaIds) {}

  public record OrderCreateRequest(UUID serviceId, UUID packageId, String requirements) {}

  public record ReasonRequest(String reason) {}

  public record DeliveryRequest(String message) {}

  public record ReviewRequest(Integer rating, String comment) {}

  public record Delivery(UUID id, String message, Instant createdAt) {}

  public record Revision(
      UUID id, String reason, int sequenceNumber, Instant acknowledgedAt, Instant createdAt) {}

  public record Cancellation(
      UUID id,
      String requestedRole,
      String reason,
      String status,
      String previousOrderStatus,
      Instant createdAt,
      Instant resolvedAt) {}

  public record OrderResponse(
      UUID id,
      String orderNumber,
      UUID serviceId,
      String serviceTitle,
      UserSummary buyer,
      UserSummary seller,
      String status,
      String packageTier,
      String packageName,
      String packageDescription,
      BigDecimal priceAmount,
      String currencyCode,
      int deliveryDays,
      int includedRevisionCount,
      int usedRevisionCount,
      String buyerRequirements,
      Instant startedAt,
      Instant deliveryDueAt,
      Instant deliveredAt,
      Instant completedAt,
      Instant cancelledAt,
      List<Delivery> deliveries,
      List<Revision> revisions,
      Cancellation pendingCancellation,
      boolean reviewEligible,
      Instant createdAt,
      Instant updatedAt) {}

  public record ReviewResponse(
      UUID id, UserSummary reviewer, int rating, String comment, Instant createdAt) {}
}

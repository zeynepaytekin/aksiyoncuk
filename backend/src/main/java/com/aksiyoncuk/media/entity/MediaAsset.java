package com.aksiyoncuk.media.entity;

import com.aksiyoncuk.user.entity.User;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "media_assets")
public class MediaAsset {
  @Id private UUID id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "owner_user_id")
  private User owner;

  @Column(name = "storage_key", nullable = false, unique = true, length = 500)
  private String storageKey;

  @Column(name = "original_filename", length = 255)
  private String originalFilename;

  @Column(name = "content_type", nullable = false, length = 100)
  private String contentType;

  @Column(name = "size_bytes", nullable = false)
  private long sizeBytes;

  @Enumerated(EnumType.STRING)
  @Column(name = "media_kind", nullable = false, length = 30)
  private MediaKind mediaKind;

  @Enumerated(EnumType.STRING)
  @Column(name = "usage_type", nullable = false, length = 50)
  private MediaUsageType usageType;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private MediaStatus status;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  protected MediaAsset() {}

  public MediaAsset(
      User owner,
      String storageKey,
      String originalFilename,
      String contentType,
      long sizeBytes,
      MediaUsageType usageType) {
    this.id = UUID.randomUUID();
    this.owner = owner;
    this.storageKey = storageKey;
    this.originalFilename = originalFilename;
    this.contentType = contentType;
    this.sizeBytes = sizeBytes;
    this.mediaKind = MediaKind.IMAGE;
    this.usageType = usageType;
    this.status = MediaStatus.ACTIVE;
    this.createdAt = Instant.now();
    this.updatedAt = createdAt;
  }

  public void markDeleted() {
    status = MediaStatus.DELETED;
    updatedAt = Instant.now();
  }

  public UUID getId() {
    return id;
  }

  public String getStorageKey() {
    return storageKey;
  }

  public String getOriginalFilename() {
    return originalFilename;
  }

  public String getContentType() {
    return contentType;
  }

  public long getSizeBytes() {
    return sizeBytes;
  }

  public MediaUsageType getUsageType() {
    return usageType;
  }

  public MediaStatus getStatus() {
    return status;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }
}

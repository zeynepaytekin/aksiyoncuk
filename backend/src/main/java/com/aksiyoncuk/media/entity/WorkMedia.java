package com.aksiyoncuk.media.entity;

import com.aksiyoncuk.work.entity.Work;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "work_media")
public class WorkMedia {
  @Id private UUID id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "work_id")
  private Work work;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "media_asset_id")
  private MediaAsset mediaAsset;

  @Column(name = "display_order", nullable = false)
  private int displayOrder;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  protected WorkMedia() {}

  public WorkMedia(Work work, MediaAsset mediaAsset, int displayOrder) {
    this.id = UUID.randomUUID();
    this.work = work;
    this.mediaAsset = mediaAsset;
    this.displayOrder = displayOrder;
    this.createdAt = Instant.now();
  }

  public UUID getId() {
    return id;
  }

  public MediaAsset getMediaAsset() {
    return mediaAsset;
  }

  public int getDisplayOrder() {
    return displayOrder;
  }

  public void setDisplayOrder(int value) {
    displayOrder = value;
  }
}

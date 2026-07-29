package com.aksiyoncuk.media.entity;

import com.aksiyoncuk.post.entity.Post;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "post_media")
public class PostMedia {
  @Id private UUID id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "post_id")
  private Post post;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "media_asset_id")
  private MediaAsset mediaAsset;

  @Column(name = "display_order", nullable = false)
  private int displayOrder;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  protected PostMedia() {}

  public PostMedia(Post post, MediaAsset mediaAsset, int displayOrder) {
    this.id = UUID.randomUUID();
    this.post = post;
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

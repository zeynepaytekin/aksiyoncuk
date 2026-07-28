package com.aksiyoncuk.network.entity;

import com.aksiyoncuk.user.entity.User;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(
    name = "user_follows",
    uniqueConstraints =
        @UniqueConstraint(
            name = "uq_user_follows_follower_followed",
            columnNames = {"follower_id", "followed_id"}))
public class UserFollow {
  @Id private UUID id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "follower_id", nullable = false)
  private User follower;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "followed_id", nullable = false)
  private User followed;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  protected UserFollow() {}

  public UserFollow(User follower, User followed) {
    this.follower = follower;
    this.followed = followed;
  }

  @PrePersist
  void onCreate() {
    if (id == null) id = UUID.randomUUID();
    if (createdAt == null) createdAt = Instant.now();
  }

  public UUID getId() {
    return id;
  }

  public User getFollower() {
    return follower;
  }

  public User getFollowed() {
    return followed;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }
}

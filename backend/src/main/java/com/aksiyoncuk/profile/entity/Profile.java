package com.aksiyoncuk.profile.entity;

import com.aksiyoncuk.user.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "profiles")
public class Profile {

  @Id private UUID id;

  @OneToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "user_id", nullable = false, unique = true)
  private User user;

  @Column(name = "professional_title", length = 120)
  private String professionalTitle;

  @Column(length = 2000)
  private String bio;

  @Column(length = 120)
  private String location;

  @Column(name = "website_url", length = 500)
  private String websiteUrl;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  protected Profile() {}

  public Profile(User user) {
    this.user = user;
  }

  @PrePersist
  void onCreate() {
    if (id == null) {
      id = UUID.randomUUID();
    }
    var now = Instant.now();
    createdAt = now;
    updatedAt = now;
  }

  @PreUpdate
  void onUpdate() {
    updatedAt = Instant.now();
  }

  public UUID getId() {
    return id;
  }

  public User getUser() {
    return user;
  }

  public String getProfessionalTitle() {
    return professionalTitle;
  }

  public String getBio() {
    return bio;
  }

  public String getLocation() {
    return location;
  }

  public String getWebsiteUrl() {
    return websiteUrl;
  }

  public void updateProfessionalTitle(String professionalTitle) {
    this.professionalTitle = professionalTitle;
  }

  public void updateBio(String bio) {
    this.bio = bio;
  }

  public void updateLocation(String location) {
    this.location = location;
  }

  public void updateWebsiteUrl(String websiteUrl) {
    this.websiteUrl = websiteUrl;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public Instant getUpdatedAt() {
    return updatedAt;
  }
}

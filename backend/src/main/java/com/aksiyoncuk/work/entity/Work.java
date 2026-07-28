package com.aksiyoncuk.work.entity;

import com.aksiyoncuk.user.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "works")
public class Work {

  @Id private UUID id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "owner_id", nullable = false)
  private User owner;

  @Column(nullable = false, length = 200)
  private String title;

  @Column(length = 5000)
  private String description;

  @Enumerated(EnumType.STRING)
  @Column(name = "work_type", nullable = false, length = 30)
  private WorkType workType;

  @Column(name = "project_url", length = 500)
  private String projectUrl;

  @Column(name = "release_year")
  private Integer releaseYear;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  protected Work() {}

  public Work(
      User owner,
      String title,
      String description,
      WorkType workType,
      String projectUrl,
      Integer releaseYear) {
    this.owner = owner;
    this.title = title;
    this.description = description;
    this.workType = workType;
    this.projectUrl = projectUrl;
    this.releaseYear = releaseYear;
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

  public void update(
      String title, String description, WorkType workType, String projectUrl, Integer releaseYear) {
    this.title = title;
    this.description = description;
    this.workType = workType;
    this.projectUrl = projectUrl;
    this.releaseYear = releaseYear;
  }

  public UUID getId() {
    return id;
  }

  public User getOwner() {
    return owner;
  }

  public String getTitle() {
    return title;
  }

  public String getDescription() {
    return description;
  }

  public WorkType getWorkType() {
    return workType;
  }

  public String getProjectUrl() {
    return projectUrl;
  }

  public Integer getReleaseYear() {
    return releaseYear;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public Instant getUpdatedAt() {
    return updatedAt;
  }
}

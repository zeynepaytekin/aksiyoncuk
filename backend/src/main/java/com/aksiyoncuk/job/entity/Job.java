package com.aksiyoncuk.job.entity;

import com.aksiyoncuk.user.entity.User;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "jobs")
public class Job {
  @Id private UUID id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "owner_id", nullable = false)
  private User owner;

  @Column(nullable = false, length = 200)
  private String title;

  @Column(nullable = false, length = 5000)
  private String description;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 30)
  private JobCategory category;

  @Enumerated(EnumType.STRING)
  @Column(name = "work_mode", nullable = false, length = 20)
  private WorkMode workMode;

  @Column(length = 150)
  private String location;

  @Enumerated(EnumType.STRING)
  @Column(name = "compensation_type", nullable = false, length = 30)
  private CompensationType compensationType;

  @Column(name = "compensation_amount", precision = 14, scale = 2)
  private BigDecimal compensationAmount;

  @Column(length = 3)
  private String currency;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private JobStatus status;

  @Column(name = "application_deadline")
  private Instant applicationDeadline;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  protected Job() {}

  public Job(
      User owner,
      String title,
      String description,
      JobCategory category,
      WorkMode workMode,
      String location,
      CompensationType compensationType,
      BigDecimal compensationAmount,
      String currency,
      Instant applicationDeadline) {
    this.owner = owner;
    this.title = title;
    this.description = description;
    this.category = category;
    this.workMode = workMode;
    this.location = location;
    this.compensationType = compensationType;
    this.compensationAmount = compensationAmount;
    this.currency = currency;
    this.applicationDeadline = applicationDeadline;
    this.status = JobStatus.OPEN;
  }

  @PrePersist
  void onCreate() {
    if (id == null) id = UUID.randomUUID();
    var now = Instant.now();
    createdAt = now;
    updatedAt = now;
  }

  @PreUpdate
  void onUpdate() {
    updatedAt = Instant.now();
  }

  public void update(
      String title,
      String description,
      JobCategory category,
      WorkMode workMode,
      String location,
      CompensationType compensationType,
      BigDecimal compensationAmount,
      String currency,
      Instant applicationDeadline) {
    this.title = title;
    this.description = description;
    this.category = category;
    this.workMode = workMode;
    this.location = location;
    this.compensationType = compensationType;
    this.compensationAmount = compensationAmount;
    this.currency = currency;
    this.applicationDeadline = applicationDeadline;
  }

  public void close() {
    status = JobStatus.CLOSED;
  }

  public void reopen() {
    status = JobStatus.OPEN;
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

  public JobCategory getCategory() {
    return category;
  }

  public WorkMode getWorkMode() {
    return workMode;
  }

  public String getLocation() {
    return location;
  }

  public CompensationType getCompensationType() {
    return compensationType;
  }

  public BigDecimal getCompensationAmount() {
    return compensationAmount;
  }

  public String getCurrency() {
    return currency;
  }

  public JobStatus getStatus() {
    return status;
  }

  public Instant getApplicationDeadline() {
    return applicationDeadline;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public Instant getUpdatedAt() {
    return updatedAt;
  }
}

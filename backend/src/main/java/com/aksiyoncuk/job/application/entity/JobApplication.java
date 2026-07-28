package com.aksiyoncuk.job.application.entity;

import com.aksiyoncuk.job.entity.Job;
import com.aksiyoncuk.user.entity.User;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(
    name = "job_applications",
    uniqueConstraints =
        @UniqueConstraint(
            name = "uq_job_applications_job_applicant",
            columnNames = {"job_id", "applicant_id"}))
public class JobApplication {
  @Id private UUID id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "job_id", nullable = false)
  private Job job;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "applicant_id", nullable = false)
  private User applicant;

  @Column(name = "cover_letter", length = 5000)
  private String coverLetter;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 30)
  private JobApplicationStatus status;

  @Column(name = "applied_at", nullable = false, updatable = false)
  private Instant appliedAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  @Column(name = "withdrawn_at")
  private Instant withdrawnAt;

  @Column(name = "reviewed_at")
  private Instant reviewedAt;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "reviewed_by_user_id")
  private User reviewedByUser;

  protected JobApplication() {}

  public JobApplication(Job job, User applicant, String coverLetter) {
    this.job = job;
    this.applicant = applicant;
    this.coverLetter = coverLetter;
    this.status = JobApplicationStatus.SUBMITTED;
  }

  @PrePersist
  void onCreate() {
    if (id == null) id = UUID.randomUUID();
    var now = Instant.now();
    appliedAt = now;
    updatedAt = now;
  }

  @PreUpdate
  void onUpdate() {
    updatedAt = Instant.now();
  }

  public void withdraw() {
    status = JobApplicationStatus.WITHDRAWN;
    withdrawnAt = Instant.now();
    reviewedAt = null;
    reviewedByUser = null;
  }

  public void accept(User reviewer) {
    review(JobApplicationStatus.ACCEPTED, reviewer);
  }

  public void reject(User reviewer) {
    review(JobApplicationStatus.REJECTED, reviewer);
  }

  private void review(JobApplicationStatus next, User reviewer) {
    status = next;
    reviewedAt = Instant.now();
    reviewedByUser = reviewer;
    withdrawnAt = null;
  }

  public UUID getId() {
    return id;
  }

  public Job getJob() {
    return job;
  }

  public User getApplicant() {
    return applicant;
  }

  public String getCoverLetter() {
    return coverLetter;
  }

  public JobApplicationStatus getStatus() {
    return status;
  }

  public Instant getAppliedAt() {
    return appliedAt;
  }

  public Instant getUpdatedAt() {
    return updatedAt;
  }

  public Instant getWithdrawnAt() {
    return withdrawnAt;
  }

  public Instant getReviewedAt() {
    return reviewedAt;
  }
}

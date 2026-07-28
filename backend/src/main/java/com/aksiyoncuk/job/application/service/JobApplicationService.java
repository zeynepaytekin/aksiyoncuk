package com.aksiyoncuk.job.application.service;

import com.aksiyoncuk.auth.exception.AuthException;
import com.aksiyoncuk.auth.security.AuthenticatedUser;
import com.aksiyoncuk.job.application.dto.*;
import com.aksiyoncuk.job.application.entity.*;
import com.aksiyoncuk.job.application.exception.*;
import com.aksiyoncuk.job.application.repository.*;
import com.aksiyoncuk.job.entity.JobStatus;
import com.aksiyoncuk.job.exception.JobNotFoundException;
import com.aksiyoncuk.job.repository.JobRepository;
import com.aksiyoncuk.user.repository.UserRepository;
import java.util.*;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class JobApplicationService {
  private static final Sort NEWEST = Sort.by(Sort.Order.desc("appliedAt"), Sort.Order.desc("id"));
  private final JobApplicationRepository applications;
  private final JobRepository jobs;
  private final UserRepository users;

  public JobApplicationService(
      JobApplicationRepository applications, JobRepository jobs, UserRepository users) {
    this.applications = applications;
    this.jobs = jobs;
    this.users = users;
  }

  @Transactional
  public JobApplicationResponse apply(
      UUID jobId, AuthenticatedUser principal, CreateJobApplicationRequest request) {
    var job = jobs.findById(jobId).orElseThrow(JobNotFoundException::new);
    if (job.getStatus() != JobStatus.OPEN) throw invalid("JOB_NOT_OPEN", "The job is not open");
    if (job.getOwner().getId().equals(principal.userId()))
      throw invalid("SELF_APPLICATION_NOT_ALLOWED", "A job owner cannot apply to their own job");
    if (applications.existsByJobIdAndApplicantId(jobId, principal.userId()))
      throw new JobApplicationConflictException();
    var applicant = users.findById(principal.userId()).orElseThrow(this::invalidToken);
    JobApplication saved;
    try {
      saved = applications.saveAndFlush(new JobApplication(job, applicant, coverLetter(request)));
    } catch (DataIntegrityViolationException exception) {
      throw new JobApplicationConflictException();
    }
    return projected(saved.getId(), principal.userId());
  }

  @Transactional(readOnly = true)
  public JobApplicationPageResponse mine(
      int page, int size, String status, AuthenticatedUser principal) {
    validatePagination(page, size);
    return response(
        applications.findApplicantProjected(
            principal.userId(), status(status), PageRequest.of(page, size, NEWEST)),
        principal.userId());
  }

  @Transactional(readOnly = true)
  public JobApplicationPageResponse forJob(
      UUID jobId, int page, int size, String status, AuthenticatedUser principal) {
    validatePagination(page, size);
    var job = jobs.findById(jobId).orElseThrow(JobNotFoundException::new);
    if (!job.getOwner().getId().equals(principal.userId()))
      throw forbidden(
          "JOB_APPLICATIONS_VIEW_FORBIDDEN", "Only the job owner may list applications");
    return response(
        applications.findJobProjected(jobId, status(status), PageRequest.of(page, size, NEWEST)),
        principal.userId());
  }

  @Transactional(readOnly = true)
  public JobApplicationResponse find(UUID id, AuthenticatedUser principal) {
    var row = applications.findProjectedById(id).orElseThrow(JobApplicationNotFoundException::new);
    if (!principal.userId().equals(row.applicantId()) && !principal.userId().equals(row.ownerId()))
      throw forbidden(
          "JOB_APPLICATION_VIEW_FORBIDDEN", "This application is not visible to this user");
    return JobApplicationResponse.from(row, principal.userId());
  }

  @Transactional
  public JobApplicationResponse withdraw(UUID id, AuthenticatedUser principal) {
    var application = applications.findById(id).orElseThrow(JobApplicationNotFoundException::new);
    if (!application.getApplicant().getId().equals(principal.userId()))
      throw forbidden("JOB_APPLICATION_WITHDRAW_FORBIDDEN", "Only the applicant may withdraw");
    if (application.getStatus() == JobApplicationStatus.WITHDRAWN)
      return projected(id, principal.userId());
    if (application.getStatus() != JobApplicationStatus.SUBMITTED) throw transition();
    application.withdraw();
    applications.flush();
    return projected(id, principal.userId());
  }

  @Transactional
  public JobApplicationResponse accept(UUID id, AuthenticatedUser principal) {
    return review(id, principal, JobApplicationStatus.ACCEPTED);
  }

  @Transactional
  public JobApplicationResponse reject(UUID id, AuthenticatedUser principal) {
    return review(id, principal, JobApplicationStatus.REJECTED);
  }

  String coverLetter(CreateJobApplicationRequest request) {
    if (request == null || request.coverLetter() == null || request.coverLetter().trim().isBlank())
      return null;
    var value = request.coverLetter().trim();
    if (value.length() > 5000)
      throw invalid(
          "INVALID_APPLICATION_COVER_LETTER", "Cover letter must not exceed 5000 characters");
    return value;
  }

  void validatePagination(int page, int size) {
    if (page < 0 || size < 1 || size > 50)
      throw invalid("INVALID_PAGINATION", "Page must be at least 0 and size between 1 and 50");
  }

  private JobApplicationResponse review(
      UUID id, AuthenticatedUser principal, JobApplicationStatus target) {
    var application = applications.findById(id).orElseThrow(JobApplicationNotFoundException::new);
    if (!application.getJob().getOwner().getId().equals(principal.userId()))
      throw forbidden("JOB_APPLICATION_REVIEW_FORBIDDEN", "Only the job owner may review");
    if (application.getStatus() == target) return projected(id, principal.userId());
    if (application.getStatus() != JobApplicationStatus.SUBMITTED) throw transition();
    var reviewer = users.findById(principal.userId()).orElseThrow(this::invalidToken);
    if (target == JobApplicationStatus.ACCEPTED) application.accept(reviewer);
    else application.reject(reviewer);
    applications.flush();
    return projected(id, principal.userId());
  }

  private JobApplicationStatus status(String value) {
    if (value == null || value.isBlank()) return null;
    try {
      return JobApplicationStatus.valueOf(value.trim().toUpperCase(Locale.ROOT));
    } catch (IllegalArgumentException exception) {
      throw invalid("INVALID_JOB_APPLICATION_STATUS", "Application status is unsupported");
    }
  }

  private JobApplicationResponse projected(UUID id, UUID userId) {
    return applications
        .findProjectedById(id)
        .map(row -> JobApplicationResponse.from(row, userId))
        .orElseThrow(JobApplicationNotFoundException::new);
  }

  private JobApplicationPageResponse response(Page<JobApplicationRow> page, UUID userId) {
    return new JobApplicationPageResponse(
        page.getContent().stream().map(row -> JobApplicationResponse.from(row, userId)).toList(),
        page.getNumber(),
        page.getSize(),
        page.getTotalElements(),
        page.getTotalPages(),
        page.isFirst(),
        page.isLast());
  }

  private InvalidJobApplicationException transition() {
    return invalid(
        "INVALID_JOB_APPLICATION_TRANSITION",
        "The application cannot transition from its current status");
  }

  private InvalidJobApplicationException invalid(String code, String message) {
    return new InvalidJobApplicationException(code, message);
  }

  private ForbiddenJobApplicationException forbidden(String code, String message) {
    return new ForbiddenJobApplicationException(code, message);
  }

  private AuthException invalidToken() {
    return new AuthException("INVALID_ACCESS_TOKEN", "Access token is invalid");
  }
}

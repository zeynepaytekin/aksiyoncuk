package com.aksiyoncuk.job.service;

import com.aksiyoncuk.auth.exception.AuthException;
import com.aksiyoncuk.auth.security.AuthenticatedUser;
import com.aksiyoncuk.job.dto.*;
import com.aksiyoncuk.job.entity.*;
import com.aksiyoncuk.job.exception.*;
import com.aksiyoncuk.job.repository.*;
import com.aksiyoncuk.profile.repository.ProfileRepository;
import com.aksiyoncuk.user.repository.UserRepository;
import java.math.BigDecimal;
import java.time.*;
import java.time.format.DateTimeParseException;
import java.util.*;
import java.util.function.Function;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class JobService {
  private static final Sort NEWEST_FIRST =
      Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"));
  private final JobRepository jobs;
  private final UserRepository users;
  private final ProfileRepository profiles;

  public JobService(JobRepository jobs, UserRepository users, ProfileRepository profiles) {
    this.jobs = jobs;
    this.users = users;
    this.profiles = profiles;
  }

  @Transactional
  public JobResponse create(AuthenticatedUser principal, CreateJobRequest request) {
    if (request == null) throw invalid("INVALID_JOB_TITLE", "Job request is required");
    var owner = users.findById(principal.userId()).orElseThrow(this::invalidToken);
    var profile = profiles.findByUserId(owner.getId()).orElseThrow(this::invalidToken);
    var type = compensationType(request.compensationType());
    var amount = amount(request.compensationAmount());
    var currency = currency(request.currency());
    validateCompensation(type, amount, currency);
    var job =
        jobs.saveAndFlush(
            new Job(
                owner,
                title(request.title()),
                description(request.description()),
                category(request.category()),
                workMode(request.workMode()),
                location(request.location()),
                type,
                amount,
                currency,
                deadline(request.applicationDeadline())));
    return JobResponse.from(
        new JobRow(
            job.getId(),
            job.getTitle(),
            job.getDescription(),
            job.getCategory(),
            job.getWorkMode(),
            job.getLocation(),
            job.getCompensationType(),
            job.getCompensationAmount(),
            job.getCurrency(),
            job.getStatus(),
            job.getApplicationDeadline(),
            job.getCreatedAt(),
            job.getUpdatedAt(),
            owner.getId(),
            owner.getUsername(),
            owner.getFullName(),
            profile.getProfessionalTitle(),
            0L),
        owner.getId());
  }

  @Transactional(readOnly = true)
  public JobPageResponse global(
      int page,
      int size,
      String status,
      String category,
      String workMode,
      AuthenticatedUser principal) {
    validatePagination(page, size);
    return page(
        jobs.findPublicProjected(
            status == null || status.isBlank()
                ? JobStatus.OPEN
                : enumValue(status, JobStatus.class),
            optionalEnum(category, JobCategory.class),
            optionalEnum(workMode, WorkMode.class),
            PageRequest.of(page, size, NEWEST_FIRST)),
        userId(principal));
  }

  @Transactional(readOnly = true)
  public JobPageResponse mine(int page, int size, String status, AuthenticatedUser principal) {
    validatePagination(page, size);
    return page(
        jobs.findOwnerProjected(
            principal.userId(),
            optionalEnum(status, JobStatus.class),
            PageRequest.of(page, size, NEWEST_FIRST)),
        principal.userId());
  }

  @Transactional(readOnly = true)
  public JobResponse find(UUID id, AuthenticatedUser principal) {
    return jobs.findProjectedById(id)
        .map(row -> JobResponse.from(row, userId(principal)))
        .orElseThrow(JobNotFoundException::new);
  }

  @Transactional
  public JobResponse update(UUID id, AuthenticatedUser principal, UpdateJobRequest request) {
    var job = ownedForUpdate(id, principal);
    if (request == null) throw invalid("INVALID_JOB_TITLE", "Job update is required");
    var type =
        supplied(request.compensationType(), job.getCompensationType(), this::compensationType);
    var amount = supplied(request.compensationAmount(), job.getCompensationAmount(), this::amount);
    var currency = supplied(request.currency(), job.getCurrency(), this::currency);
    validateCompensation(type, amount, currency);
    job.update(
        supplied(request.title(), job.getTitle(), this::title),
        supplied(request.description(), job.getDescription(), this::description),
        supplied(request.category(), job.getCategory(), this::category),
        supplied(request.workMode(), job.getWorkMode(), this::workMode),
        supplied(request.location(), job.getLocation(), this::location),
        type,
        amount,
        currency,
        supplied(request.applicationDeadline(), job.getApplicationDeadline(), this::deadline));
    jobs.flush();
    return projected(id, principal.userId());
  }

  @Transactional
  public JobResponse close(UUID id, AuthenticatedUser principal) {
    var job = ownedForUpdate(id, principal);
    job.close();
    jobs.flush();
    return projected(id, principal.userId());
  }

  @Transactional
  public JobResponse reopen(UUID id, AuthenticatedUser principal) {
    var job = ownedForUpdate(id, principal);
    job.reopen();
    jobs.flush();
    return projected(id, principal.userId());
  }

  @Transactional
  public void delete(UUID id, AuthenticatedUser principal) {
    var job = jobs.findById(id).orElseThrow(JobNotFoundException::new);
    if (!job.getOwner().getId().equals(principal.userId())) throw new JobDeleteForbiddenException();
    jobs.delete(job);
  }

  String title(String value) {
    return required(value, 200, "INVALID_JOB_TITLE", "Job title");
  }

  String description(String value) {
    return required(value, 5000, "INVALID_JOB_DESCRIPTION", "Job description");
  }

  String location(String value) {
    if (value == null || value.trim().isBlank()) return null;
    var result = value.trim();
    if (result.length() > 150)
      throw invalid("INVALID_JOB_TYPE", "Location must not exceed 150 characters");
    return result;
  }

  String currency(String value) {
    if (value == null || value.trim().isBlank()) return null;
    var result = value.trim().toUpperCase(Locale.ROOT);
    if (!result.matches("[A-Z]{3}")) {
      throw invalid("INVALID_JOB_CURRENCY", "Currency must be a three-letter code");
    }
    return result;
  }

  BigDecimal amount(BigDecimal value) {
    if (value != null
        && (value.signum() <= 0 || value.scale() > 2 || value.precision() - value.scale() > 12)) {
      throw invalid(
          "INVALID_JOB_COMPENSATION", "Compensation amount must be positive and fit NUMERIC(14,2)");
    }
    return value;
  }

  Instant deadline(String value) {
    if (value == null || value.trim().isBlank()) return null;
    try {
      var result = Instant.parse(value.trim());
      if (!result.isAfter(Instant.now()))
        throw invalid("INVALID_JOB_DEADLINE", "Application deadline must be in the future");
      return result;
    } catch (DateTimeParseException exception) {
      throw invalid("INVALID_JOB_DEADLINE", "Application deadline must be a UTC ISO timestamp");
    }
  }

  JobCategory category(String value) {
    return requiredEnum(value, JobCategory.class, "Category");
  }

  WorkMode workMode(String value) {
    return requiredEnum(value, WorkMode.class, "Work mode");
  }

  CompensationType compensationType(String value) {
    return requiredEnum(value, CompensationType.class, "Compensation type");
  }

  void validatePagination(int page, int size) {
    if (page < 0 || size < 1 || size > 50) throw new InvalidJobPaginationException();
  }

  private Job ownedForUpdate(UUID id, AuthenticatedUser principal) {
    var job = jobs.findById(id).orElseThrow(JobNotFoundException::new);
    if (!job.getOwner().getId().equals(principal.userId())) throw new JobUpdateForbiddenException();
    return job;
  }

  private void validateCompensation(CompensationType type, BigDecimal amount, String currency) {
    boolean valid =
        switch (type) {
          case UNPAID -> amount == null && currency == null;
          case FIXED -> amount != null && amount.signum() > 0 && currency != null;
          case NEGOTIABLE -> amount == null || amount.signum() > 0;
        };
    if (!valid)
      throw invalid(
          "INVALID_JOB_COMPENSATION",
          "Compensation fields are inconsistent with compensation type");
  }

  private String required(String value, int max, String code, String label) {
    if (value == null || value.trim().isBlank()) throw invalid(code, label + " must not be blank");
    var result = value.trim();
    if (result.length() > max)
      throw invalid(code, label + " must not exceed " + max + " characters");
    return result;
  }

  private <E extends Enum<E>> E requiredEnum(String value, Class<E> type, String label) {
    if (value == null || value.isBlank()) throw invalid("INVALID_JOB_TYPE", label + " is required");
    return enumValue(value, type);
  }

  private <E extends Enum<E>> E optionalEnum(String value, Class<E> type) {
    return value == null || value.isBlank() ? null : enumValue(value, type);
  }

  private <E extends Enum<E>> E enumValue(String value, Class<E> type) {
    try {
      return Enum.valueOf(type, value.trim().toUpperCase(Locale.ROOT));
    } catch (IllegalArgumentException exception) {
      throw invalid("INVALID_JOB_TYPE", "Job filter or enum value is unsupported");
    }
  }

  private <T, R> R supplied(JobPatchField<T> field, R current, Function<T, R> normalizer) {
    return field != null && field.present() ? normalizer.apply(field.value()) : current;
  }

  private JobResponse projected(UUID id, UUID currentUserId) {
    return jobs.findProjectedById(id)
        .map(row -> JobResponse.from(row, currentUserId))
        .orElseThrow(JobNotFoundException::new);
  }

  private JobPageResponse page(Page<JobRow> rows, UUID currentUserId) {
    return new JobPageResponse(
        rows.getContent().stream().map(row -> JobResponse.from(row, currentUserId)).toList(),
        rows.getNumber(),
        rows.getSize(),
        rows.getTotalElements(),
        rows.getTotalPages(),
        rows.isFirst(),
        rows.isLast());
  }

  private UUID userId(AuthenticatedUser principal) {
    return principal == null ? null : principal.userId();
  }

  private AuthException invalidToken() {
    return new AuthException("INVALID_ACCESS_TOKEN", "Access token is invalid");
  }

  private InvalidJobException invalid(String code, String message) {
    return new InvalidJobException(code, message);
  }
}

package com.aksiyoncuk.work.service;

import com.aksiyoncuk.auth.exception.AuthException;
import com.aksiyoncuk.auth.security.AuthenticatedUser;
import com.aksiyoncuk.media.service.MediaService;
import com.aksiyoncuk.profile.exception.ProfileNotFoundException;
import com.aksiyoncuk.profile.repository.ProfileRepository;
import com.aksiyoncuk.user.repository.UserRepository;
import com.aksiyoncuk.work.dto.CreateWorkRequest;
import com.aksiyoncuk.work.dto.UpdateWorkRequest;
import com.aksiyoncuk.work.dto.WorkPageResponse;
import com.aksiyoncuk.work.dto.WorkPatchField;
import com.aksiyoncuk.work.dto.WorkResponse;
import com.aksiyoncuk.work.entity.Work;
import com.aksiyoncuk.work.entity.WorkType;
import com.aksiyoncuk.work.exception.InvalidWorkException;
import com.aksiyoncuk.work.exception.InvalidWorkPaginationException;
import com.aksiyoncuk.work.exception.WorkDeleteForbiddenException;
import com.aksiyoncuk.work.exception.WorkNotFoundException;
import com.aksiyoncuk.work.exception.WorkUpdateForbiddenException;
import com.aksiyoncuk.work.repository.WorkRepository;
import com.aksiyoncuk.work.repository.WorkRow;
import java.net.URI;
import java.time.Year;
import java.time.ZoneOffset;
import java.util.Locale;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class WorkService {

  private static final Sort NEWEST_FIRST =
      Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"));

  private final WorkRepository workRepository;
  private final UserRepository userRepository;
  private final ProfileRepository profileRepository;
  private final MediaService mediaService;

  public WorkService(
      WorkRepository workRepository,
      UserRepository userRepository,
      ProfileRepository profileRepository) {
    this(workRepository, userRepository, profileRepository, null);
  }

  @Autowired
  public WorkService(
      WorkRepository workRepository,
      UserRepository userRepository,
      ProfileRepository profileRepository,
      MediaService mediaService) {
    this.workRepository = workRepository;
    this.userRepository = userRepository;
    this.profileRepository = profileRepository;
    this.mediaService = mediaService;
  }

  @Transactional
  public WorkResponse create(AuthenticatedUser principal, CreateWorkRequest request) {
    if (request == null) {
      throw invalid("INVALID_WORK_TITLE", "Work title is required");
    }
    var owner =
        userRepository
            .findById(principal.userId())
            .orElseThrow(
                () -> new AuthException("INVALID_ACCESS_TOKEN", "Access token is invalid"));
    var profile =
        profileRepository
            .findByUserId(owner.getId())
            .orElseThrow(
                () -> new AuthException("INVALID_ACCESS_TOKEN", "Access token is invalid"));
    var work =
        workRepository.saveAndFlush(
            new Work(
                owner,
                title(request.title()),
                nullableText(request.description(), 5000, "description"),
                workType(request.workType()),
                projectUrl(request.projectUrl()),
                releaseYear(request.releaseYear())));
    return WorkResponse.from(
        new WorkRow(
            work.getId(),
            work.getTitle(),
            work.getDescription(),
            work.getWorkType(),
            work.getProjectUrl(),
            work.getReleaseYear(),
            work.getCreatedAt(),
            work.getUpdatedAt(),
            owner.getId(),
            owner.getUsername(),
            owner.getFullName(),
            profile.getProfessionalTitle()),
        owner.getId());
  }

  @Transactional(readOnly = true)
  public WorkPageResponse currentUserWorks(int page, int size, AuthenticatedUser principal) {
    validatePagination(page, size);
    return response(
        workRepository.findByOwnerIdProjected(
            principal.userId(), PageRequest.of(page, size, NEWEST_FIRST)),
        principal.userId());
  }

  @Transactional(readOnly = true)
  public WorkPageResponse publicWorks(
      String username, int page, int size, AuthenticatedUser principal) {
    validatePagination(page, size);
    var normalized = normalizeUsername(username);
    if (userRepository.findByUsername(normalized).isEmpty()) {
      throw new ProfileNotFoundException();
    }
    return response(
        workRepository.findByUsernameProjected(
            normalized, PageRequest.of(page, size, NEWEST_FIRST)),
        userId(principal));
  }

  @Transactional(readOnly = true)
  public WorkResponse find(UUID workId, AuthenticatedUser principal) {
    return workRepository
        .findProjectedById(workId)
        .map(row -> withMedia(WorkResponse.from(row, userId(principal))))
        .orElseThrow(WorkNotFoundException::new);
  }

  @Transactional
  public WorkResponse update(UUID workId, AuthenticatedUser principal, UpdateWorkRequest request) {
    var work = workRepository.findById(workId).orElseThrow(WorkNotFoundException::new);
    if (!work.getOwner().getId().equals(principal.userId())) {
      throw new WorkUpdateForbiddenException();
    }
    if (request == null) {
      throw invalid("INVALID_WORK_TITLE", "Work update is required");
    }
    work.update(
        supplied(request.title(), work.getTitle(), this::title),
        supplied(
            request.description(),
            work.getDescription(),
            value -> nullableText(value, 5000, "description")),
        supplied(request.workType(), work.getWorkType(), this::workType),
        supplied(request.projectUrl(), work.getProjectUrl(), this::projectUrl),
        supplied(request.releaseYear(), work.getReleaseYear(), this::releaseYear));
    workRepository.flush();
    return workRepository
        .findProjectedById(workId)
        .map(row -> withMedia(WorkResponse.from(row, principal.userId())))
        .orElseThrow(WorkNotFoundException::new);
  }

  @Transactional
  public void delete(UUID workId, AuthenticatedUser principal) {
    var work = workRepository.findById(workId).orElseThrow(WorkNotFoundException::new);
    if (!work.getOwner().getId().equals(principal.userId())) {
      throw new WorkDeleteForbiddenException();
    }
    if (mediaService != null) mediaService.removeWorkMedia(workId);
    workRepository.delete(work);
  }

  String title(String value) {
    if (value == null || value.trim().isBlank()) {
      throw invalid("INVALID_WORK_TITLE", "Work title must not be blank");
    }
    var normalized = value.trim();
    if (normalized.length() > 200) {
      throw invalid("INVALID_WORK_TITLE", "Work title must not exceed 200 characters");
    }
    return normalized;
  }

  String nullableText(String value, int maximum, String field) {
    if (value == null || value.trim().isBlank()) return null;
    var normalized = value.trim();
    if (normalized.length() > maximum) {
      throw invalid("INVALID_WORK", field + " must not exceed " + maximum + " characters");
    }
    return normalized;
  }

  String projectUrl(String value) {
    if (value == null || value.trim().isBlank()) return null;
    var normalized = value.trim();
    if (normalized.length() > 500) {
      throw invalid("INVALID_WORK_URL", "Project URL must not exceed 500 characters");
    }
    try {
      var uri = URI.create(normalized);
      var scheme = uri.getScheme();
      if (!uri.isAbsolute()
          || uri.getHost() == null
          || (!"http".equalsIgnoreCase(scheme) && !"https".equalsIgnoreCase(scheme))) {
        throw invalid("INVALID_WORK_URL", "Project URL must be an absolute HTTP or HTTPS URL");
      }
    } catch (IllegalArgumentException exception) {
      throw invalid("INVALID_WORK_URL", "Project URL must be an absolute HTTP or HTTPS URL");
    }
    return normalized;
  }

  Integer releaseYear(Integer value) {
    if (value == null) return null;
    var maximum = Year.now(ZoneOffset.UTC).getValue() + 5;
    if (value < 1888 || value > maximum) {
      throw invalid("INVALID_WORK_YEAR", "Release year must be between 1888 and " + maximum);
    }
    return value;
  }

  WorkType workType(String value) {
    if (value == null || value.isBlank()) {
      throw invalid("INVALID_WORK_TYPE", "Work type is required");
    }
    try {
      return WorkType.valueOf(value.trim().toUpperCase(Locale.ROOT));
    } catch (IllegalArgumentException exception) {
      throw invalid("INVALID_WORK_TYPE", "Work type is unsupported");
    }
  }

  String normalizeUsername(String username) {
    if (username == null || username.trim().isBlank() || username.trim().length() > 30) {
      throw new ProfileNotFoundException();
    }
    return username.trim().toLowerCase(Locale.ROOT);
  }

  void validatePagination(int page, int size) {
    if (page < 0 || size < 1 || size > 50) {
      throw new InvalidWorkPaginationException();
    }
  }

  private <T, R> R supplied(
      WorkPatchField<T> field, R current, java.util.function.Function<T, R> normalizer) {
    return field != null && field.present() ? normalizer.apply(field.value()) : current;
  }

  private WorkPageResponse response(Page<WorkRow> rows, UUID currentUserId) {
    return new WorkPageResponse(
        rows.getContent().stream()
            .map(row -> withMedia(WorkResponse.from(row, currentUserId)))
            .toList(),
        rows.getNumber(),
        rows.getSize(),
        rows.getTotalElements(),
        rows.getTotalPages(),
        rows.isFirst(),
        rows.isLast());
  }

  private WorkResponse withMedia(WorkResponse response) {
    return mediaService == null
        ? response
        : response.withMedia(mediaService.workItems(response.id()));
  }

  private UUID userId(AuthenticatedUser principal) {
    return principal == null ? null : principal.userId();
  }

  private InvalidWorkException invalid(String code, String message) {
    return new InvalidWorkException(code, message);
  }
}

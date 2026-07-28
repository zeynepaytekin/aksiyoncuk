package com.aksiyoncuk.search.service;

import com.aksiyoncuk.auth.security.AuthenticatedUser;
import com.aksiyoncuk.job.dto.JobResponse;
import com.aksiyoncuk.job.entity.CompensationType;
import com.aksiyoncuk.job.entity.JobCategory;
import com.aksiyoncuk.job.entity.JobStatus;
import com.aksiyoncuk.job.entity.WorkMode;
import com.aksiyoncuk.job.repository.JobRepository;
import com.aksiyoncuk.post.dto.PostResponse;
import com.aksiyoncuk.post.repository.PostRepository;
import com.aksiyoncuk.search.dto.CombinedSearchResponse;
import com.aksiyoncuk.search.dto.SearchGroupResponse;
import com.aksiyoncuk.search.dto.SearchPageResponse;
import com.aksiyoncuk.search.dto.SearchUserResponse;
import com.aksiyoncuk.search.exception.SearchException;
import com.aksiyoncuk.user.repository.UserRepository;
import com.aksiyoncuk.work.dto.WorkResponse;
import com.aksiyoncuk.work.entity.WorkType;
import com.aksiyoncuk.work.repository.WorkRepository;
import java.time.Year;
import java.time.ZoneOffset;
import java.util.Locale;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SearchService {

  private static final Sort NEWEST_FIRST =
      Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"));
  private static final String USERNAME_PATTERN = "[a-z0-9._-]{3,30}";

  private final UserRepository userRepository;
  private final PostRepository postRepository;
  private final WorkRepository workRepository;
  private final JobRepository jobRepository;

  public SearchService(
      UserRepository userRepository,
      PostRepository postRepository,
      WorkRepository workRepository,
      JobRepository jobRepository) {
    this.userRepository = userRepository;
    this.postRepository = postRepository;
    this.workRepository = workRepository;
    this.jobRepository = jobRepository;
  }

  @Transactional(readOnly = true)
  public SearchPageResponse<SearchUserResponse> users(
      String query, int page, int size, AuthenticatedUser principal) {
    validatePagination(page, size);
    var term = term(query);
    var rows =
        userRepository.search(
            term.normalized(),
            term.containsPattern(),
            term.prefixPattern(),
            viewerId(principal),
            PageRequest.of(page, size));
    return SearchPageResponse.from(rows, SearchUserResponse::from);
  }

  @Transactional(readOnly = true)
  public SearchPageResponse<PostResponse> posts(
      String query, int page, int size, String authorUsername, AuthenticatedUser principal) {
    validatePagination(page, size);
    var viewerId = viewerId(principal);
    var rows =
        postRepository.search(
            term(query).containsPattern(),
            optionalUsername(authorUsername),
            viewerId,
            PageRequest.of(page, size, NEWEST_FIRST));
    return SearchPageResponse.from(rows, row -> PostResponse.from(row, viewerId));
  }

  @Transactional(readOnly = true)
  public SearchPageResponse<WorkResponse> works(
      String query,
      int page,
      int size,
      String workType,
      String ownerUsername,
      Integer releaseYear,
      AuthenticatedUser principal) {
    validatePagination(page, size);
    validateReleaseYear(releaseYear);
    var viewerId = viewerId(principal);
    var rows =
        workRepository.search(
            term(query).containsPattern(),
            enumValue(WorkType.class, workType),
            optionalUsername(ownerUsername),
            releaseYear,
            PageRequest.of(page, size, NEWEST_FIRST));
    return SearchPageResponse.from(rows, row -> WorkResponse.from(row, viewerId));
  }

  @Transactional(readOnly = true)
  public SearchPageResponse<JobResponse> jobs(
      String query,
      int page,
      int size,
      String category,
      String workMode,
      String status,
      String compensationType,
      String ownerUsername,
      AuthenticatedUser principal) {
    validatePagination(page, size);
    var viewerId = viewerId(principal);
    var rows =
        jobRepository.search(
            term(query).containsPattern(),
            status == null ? JobStatus.OPEN : enumValue(JobStatus.class, status),
            enumValue(JobCategory.class, category),
            enumValue(WorkMode.class, workMode),
            enumValue(CompensationType.class, compensationType),
            optionalUsername(ownerUsername),
            PageRequest.of(page, size, NEWEST_FIRST));
    return SearchPageResponse.from(rows, row -> JobResponse.from(row, viewerId));
  }

  @Transactional(readOnly = true)
  public CombinedSearchResponse combined(
      String query, int limitPerType, AuthenticatedUser principal) {
    if (limitPerType < 1 || limitPerType > 10) {
      throw pagination("limitPerType must be between 1 and 10");
    }
    var normalized = term(query).normalized();
    var users = users(normalized, 0, limitPerType, principal);
    var posts = posts(normalized, 0, limitPerType, null, principal);
    var works = works(normalized, 0, limitPerType, null, null, null, principal);
    var jobs = jobs(normalized, 0, limitPerType, null, null, null, null, null, principal);
    return new CombinedSearchResponse(
        normalized, group(users), group(posts), group(works), group(jobs));
  }

  public SearchTerm term(String query) {
    if (query == null) {
      throw query("Search query is required");
    }
    var normalized = query.trim().replaceAll("\\s+", " ").toLowerCase(Locale.ROOT);
    if (normalized.length() < 2 || normalized.length() > 100) {
      throw query("Search query must contain between 2 and 100 characters");
    }
    var escaped = escapeLike(normalized);
    return new SearchTerm(normalized, "%" + escaped + "%", escaped + "%");
  }

  public String escapeLike(String value) {
    return value.replace("!", "!!").replace("%", "!%").replace("_", "!_");
  }

  private void validatePagination(int page, int size) {
    if (page < 0 || size < 1 || size > 50) {
      throw pagination("Page must be at least 0 and size must be between 1 and 50");
    }
  }

  private void validateReleaseYear(Integer year) {
    var maximum = Year.now(ZoneOffset.UTC).getValue() + 5;
    if (year != null && (year < 1888 || year > maximum)) {
      throw filter("Release year must be between 1888 and " + maximum);
    }
  }

  private String optionalUsername(String value) {
    if (value == null || value.isBlank()) return null;
    var normalized = value.trim().toLowerCase(Locale.ROOT);
    if (!normalized.matches(USERNAME_PATTERN)) {
      throw filter("Username filter is invalid");
    }
    return normalized;
  }

  private <E extends Enum<E>> E enumValue(Class<E> type, String value) {
    if (value == null || value.isBlank()) return null;
    try {
      return Enum.valueOf(type, value.trim().toUpperCase(Locale.ROOT));
    } catch (IllegalArgumentException exception) {
      throw filter("Search filter value is unsupported");
    }
  }

  private UUID viewerId(AuthenticatedUser principal) {
    return principal == null ? null : principal.userId();
  }

  private <T> SearchGroupResponse<T> group(SearchPageResponse<T> page) {
    return new SearchGroupResponse<>(page.content(), page.totalElements());
  }

  private SearchException query(String message) {
    return new SearchException("INVALID_SEARCH_QUERY", message);
  }

  private SearchException pagination(String message) {
    return new SearchException("INVALID_SEARCH_PAGINATION", message);
  }

  private SearchException filter(String message) {
    return new SearchException("INVALID_SEARCH_FILTER", message);
  }

  public record SearchTerm(String normalized, String containsPattern, String prefixPattern) {}
}

package com.aksiyoncuk.search.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.aksiyoncuk.auth.security.AuthenticatedUser;
import com.aksiyoncuk.job.entity.JobStatus;
import com.aksiyoncuk.job.repository.JobRepository;
import com.aksiyoncuk.post.repository.PostRepository;
import com.aksiyoncuk.search.exception.SearchException;
import com.aksiyoncuk.user.repository.UserRepository;
import com.aksiyoncuk.user.repository.UserSearchRow;
import com.aksiyoncuk.work.entity.WorkType;
import com.aksiyoncuk.work.repository.WorkRepository;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

@ExtendWith(MockitoExtension.class)
class SearchServiceTest {

  @Mock private UserRepository users;
  @Mock private PostRepository posts;
  @Mock private WorkRepository works;
  @Mock private JobRepository jobs;
  private SearchService service;

  @BeforeEach
  void setUp() {
    service = new SearchService(users, posts, works, jobs);
  }

  @Test
  void normalizesWhitespaceAndEscapesWildcards() {
    var term = service.term("  Creative   100%_!  ");

    assertThat(term.normalized()).isEqualTo("creative 100%_!");
    assertThat(term.containsPattern()).isEqualTo("%creative 100!%!_!!%");
    assertThat(term.prefixPattern()).isEqualTo("creative 100!%!_!!%");
  }

  @Test
  void rejectsInvalidQueryLengths() {
    assertThatThrownBy(() -> service.term("x"))
        .isInstanceOf(SearchException.class)
        .extracting("code")
        .isEqualTo("INVALID_SEARCH_QUERY");
    assertThatThrownBy(() -> service.term("x".repeat(101))).isInstanceOf(SearchException.class);
  }

  @Test
  void rejectsInvalidPaginationAndLimit() {
    assertThatThrownBy(() -> service.users("editor", -1, 20, null))
        .isInstanceOf(SearchException.class)
        .extracting("code")
        .isEqualTo("INVALID_SEARCH_PAGINATION");
    assertThatThrownBy(() -> service.combined("editor", 11, null))
        .isInstanceOf(SearchException.class)
        .extracting("code")
        .isEqualTo("INVALID_SEARCH_PAGINATION");
  }

  @Test
  void mapsSafeUserSearchAndViewerState() {
    var viewerId = UUID.randomUUID();
    var row =
        new UserSearchRow(
            UUID.randomUUID(), "editor", "Edit User", "Editor", "Istanbul", 2, 3, true);
    when(users.search(anyString(), anyString(), anyString(), eq(viewerId), any()))
        .thenReturn(new PageImpl<>(List.of(row), PageRequest.of(0, 20), 1));

    var result = service.users("editor", 0, 20, new AuthenticatedUser(viewerId));

    assertThat(result.content())
        .singleElement()
        .satisfies(
            user -> {
              assertThat(user.username()).isEqualTo("editor");
              assertThat(user.followedByCurrentUser()).isTrue();
              assertThat(user.followerCount()).isEqualTo(2);
            });
  }

  @Test
  void validatesWorkAndJobFilters() {
    when(works.search(anyString(), eq(WorkType.SHORT_FILM), isNull(), eq(2026), any()))
        .thenReturn(new PageImpl<>(List.of()));
    service.works("editor", 0, 20, "short_film", null, 2026, null);

    when(jobs.search(
            anyString(), eq(JobStatus.OPEN), isNull(), isNull(), isNull(), isNull(), any()))
        .thenReturn(new PageImpl<>(List.of()));
    service.jobs("editor", 0, 20, null, null, null, null, null, null);

    assertThatThrownBy(() -> service.jobs("editor", 0, 20, "unknown", null, null, null, null, null))
        .isInstanceOf(SearchException.class)
        .extracting("code")
        .isEqualTo("INVALID_SEARCH_FILTER");
  }

  @Test
  void unknownOptionalUsernameIsPassedAsAFilterAndCanProduceEmptyResults() {
    when(posts.search(anyString(), eq("missing_user"), isNull(), any()))
        .thenReturn(new PageImpl<>(List.of()));

    var result = service.posts("editor", 0, 20, "Missing_User", null);

    assertThat(result.content()).isEmpty();
  }
}

package com.aksiyoncuk.work.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.aksiyoncuk.auth.security.AuthenticatedUser;
import com.aksiyoncuk.profile.entity.Profile;
import com.aksiyoncuk.profile.exception.ProfileNotFoundException;
import com.aksiyoncuk.profile.repository.ProfileRepository;
import com.aksiyoncuk.user.entity.User;
import com.aksiyoncuk.user.repository.UserRepository;
import com.aksiyoncuk.work.dto.CreateWorkRequest;
import com.aksiyoncuk.work.dto.UpdateWorkRequest;
import com.aksiyoncuk.work.dto.WorkPatchField;
import com.aksiyoncuk.work.entity.Work;
import com.aksiyoncuk.work.entity.WorkType;
import com.aksiyoncuk.work.exception.InvalidWorkException;
import com.aksiyoncuk.work.exception.InvalidWorkPaginationException;
import com.aksiyoncuk.work.exception.WorkDeleteForbiddenException;
import com.aksiyoncuk.work.exception.WorkNotFoundException;
import com.aksiyoncuk.work.exception.WorkUpdateForbiddenException;
import com.aksiyoncuk.work.repository.WorkRepository;
import com.aksiyoncuk.work.repository.WorkRow;
import java.time.Instant;
import java.time.Year;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;

@ExtendWith(MockitoExtension.class)
class WorkServiceTest {

  @Mock private WorkRepository workRepository;
  @Mock private UserRepository userRepository;
  @Mock private ProfileRepository profileRepository;
  @Mock private User user;
  @Mock private Profile profile;
  @Mock private Work work;

  private WorkService service;
  private UUID userId;

  @BeforeEach
  void setUp() {
    service = new WorkService(workRepository, userRepository, profileRepository);
    userId = UUID.randomUUID();
  }

  @Test
  void normalizesTitleDescriptionUrlTypeAndYear() {
    assertThat(service.title("  Project  ")).isEqualTo("Project");
    assertThat(service.nullableText("   ", 5000, "description")).isNull();
    assertThat(service.projectUrl(" https://example.com/work "))
        .isEqualTo("https://example.com/work");
    assertThat(service.workType("short_film")).isEqualTo(WorkType.SHORT_FILM);
    assertThat(service.releaseYear(Year.now(ZoneOffset.UTC).getValue() + 5)).isNotNull();
  }

  @Test
  void rejectsBlankTitleInvalidUrlYearAndType() {
    assertThatThrownBy(() -> service.title("  ")).isInstanceOf(InvalidWorkException.class);
    assertThatThrownBy(() -> service.projectUrl("javascript:alert(1)"))
        .isInstanceOf(InvalidWorkException.class)
        .hasMessageContaining("HTTP");
    assertThatThrownBy(() -> service.releaseYear(Year.now(ZoneOffset.UTC).getValue() + 6))
        .isInstanceOf(InvalidWorkException.class);
    assertThatThrownBy(() -> service.workType("unsupported"))
        .isInstanceOf(InvalidWorkException.class);
  }

  @Test
  void createsWorkForAuthenticatedOwner() {
    when(userRepository.findById(userId)).thenReturn(Optional.of(user));
    when(user.getId()).thenReturn(userId);
    when(user.getUsername()).thenReturn("creator");
    when(user.getFullName()).thenReturn("Creative User");
    when(profileRepository.findByUserId(userId)).thenReturn(Optional.of(profile));
    when(profile.getProfessionalTitle()).thenReturn("Director");
    when(workRepository.saveAndFlush(any(Work.class)))
        .thenAnswer(call -> call.getArgument(0, Work.class));

    var response =
        service.create(
            new AuthenticatedUser(userId),
            new CreateWorkRequest(
                " My Film ", " Description ", "SHORT_FILM", "https://example.com", 2026));

    assertThat(response.title()).isEqualTo("My Film");
    assertThat(response.description()).isEqualTo("Description");
    assertThat(response.ownedByCurrentUser()).isTrue();
    assertThat(response.owner().professionalTitle()).isEqualTo("Director");
  }

  @Test
  void mapsAuthenticatedAndAnonymousOwnership() {
    var row = row(userId, "creator");
    when(userRepository.findByUsername("creator")).thenReturn(Optional.of(user));
    when(workRepository.findByUsernameProjected(any(), any()))
        .thenReturn(new PageImpl<>(List.of(row)));

    assertThat(
            service
                .publicWorks(" CREATOR ", 0, 20, new AuthenticatedUser(userId))
                .content()
                .getFirst()
                .ownedByCurrentUser())
        .isTrue();
    assertThat(
            service.publicWorks("creator", 0, 20, null).content().getFirst().ownedByCurrentUser())
        .isFalse();
  }

  @Test
  void partialUpdatePreservesMissingAndClearsExplicitNull() {
    var workId = UUID.randomUUID();
    when(workRepository.findById(workId)).thenReturn(Optional.of(work));
    when(work.getOwner()).thenReturn(user);
    when(user.getId()).thenReturn(userId);
    when(work.getTitle()).thenReturn("Existing");
    when(work.getDescription()).thenReturn("Description");
    when(work.getWorkType()).thenReturn(WorkType.FILM);
    when(work.getProjectUrl()).thenReturn("https://example.com");
    when(work.getReleaseYear()).thenReturn(2025);
    when(workRepository.findProjectedById(workId)).thenReturn(Optional.of(row(userId, "creator")));

    service.update(
        workId,
        new AuthenticatedUser(userId),
        new UpdateWorkRequest(
            WorkPatchField.supplied(" Updated "),
            WorkPatchField.supplied(null),
            WorkPatchField.missing(),
            WorkPatchField.missing(),
            WorkPatchField.missing()));

    verify(work).update("Updated", null, WorkType.FILM, "https://example.com", 2025);
  }

  @Test
  void rejectsNonOwnerUpdateAndDelete() {
    when(workRepository.findById(any())).thenReturn(Optional.of(work));
    when(work.getOwner()).thenReturn(user);
    when(user.getId()).thenReturn(UUID.randomUUID());
    var principal = new AuthenticatedUser(userId);
    var request =
        new UpdateWorkRequest(
            WorkPatchField.missing(),
            WorkPatchField.missing(),
            WorkPatchField.missing(),
            WorkPatchField.missing(),
            WorkPatchField.missing());

    assertThatThrownBy(() -> service.update(UUID.randomUUID(), principal, request))
        .isInstanceOf(WorkUpdateForbiddenException.class);
    assertThatThrownBy(() -> service.delete(UUID.randomUUID(), principal))
        .isInstanceOf(WorkDeleteForbiddenException.class);
  }

  @Test
  void ownerCanDeleteAndMissingWorkFails() {
    when(workRepository.findById(any())).thenReturn(Optional.of(work), Optional.empty());
    when(work.getOwner()).thenReturn(user);
    when(user.getId()).thenReturn(userId);
    service.delete(UUID.randomUUID(), new AuthenticatedUser(userId));
    verify(workRepository).delete(work);
    assertThatThrownBy(() -> service.delete(UUID.randomUUID(), new AuthenticatedUser(userId)))
        .isInstanceOf(WorkNotFoundException.class);
  }

  @Test
  void validatesPaginationAndNormalizesUsername() {
    assertThat(service.normalizeUsername(" Creator ")).isEqualTo("creator");
    assertThatThrownBy(() -> service.validatePagination(-1, 20))
        .isInstanceOf(InvalidWorkPaginationException.class);
    assertThatThrownBy(() -> service.validatePagination(0, 51))
        .isInstanceOf(InvalidWorkPaginationException.class);
    when(userRepository.findByUsername("unknown")).thenReturn(Optional.empty());
    assertThatThrownBy(() -> service.publicWorks("unknown", 0, 20, null))
        .isInstanceOf(ProfileNotFoundException.class);
  }

  private WorkRow row(UUID ownerId, String username) {
    var now = Instant.now();
    return new WorkRow(
        UUID.randomUUID(),
        "Work",
        "Description",
        WorkType.FILM,
        "https://example.com",
        2025,
        now,
        now,
        ownerId,
        username,
        "Creative User",
        "Director");
  }
}

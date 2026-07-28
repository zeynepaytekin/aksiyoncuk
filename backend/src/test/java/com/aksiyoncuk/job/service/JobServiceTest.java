package com.aksiyoncuk.job.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.aksiyoncuk.auth.security.AuthenticatedUser;
import com.aksiyoncuk.job.dto.*;
import com.aksiyoncuk.job.entity.*;
import com.aksiyoncuk.job.exception.*;
import com.aksiyoncuk.job.repository.*;
import com.aksiyoncuk.profile.entity.Profile;
import com.aksiyoncuk.profile.repository.ProfileRepository;
import com.aksiyoncuk.user.entity.User;
import com.aksiyoncuk.user.repository.UserRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;

@ExtendWith(MockitoExtension.class)
class JobServiceTest {
  @Mock JobRepository jobs;
  @Mock UserRepository users;
  @Mock ProfileRepository profiles;
  @Mock User user;
  @Mock Profile profile;
  @Mock Job job;
  JobService service;
  UUID userId;

  @BeforeEach
  void setUp() {
    service = new JobService(jobs, users, profiles);
    userId = UUID.randomUUID();
  }

  @Test
  void normalizesTextLocationAndCurrency() {
    assertThat(service.title(" Title ")).isEqualTo("Title");
    assertThat(service.description(" Description ")).isEqualTo("Description");
    assertThat(service.location(" ")).isNull();
    assertThat(service.currency(" try ")).isEqualTo("TRY");
  }

  @Test
  void rejectsBlankRequiredFieldsInvalidCurrencyAndPastDeadline() {
    assertThatThrownBy(() -> service.title(" ")).isInstanceOf(InvalidJobException.class);
    assertThatThrownBy(() -> service.description(null)).isInstanceOf(InvalidJobException.class);
    assertThatThrownBy(() -> service.currency("EURO")).isInstanceOf(InvalidJobException.class);
    assertThatThrownBy(() -> service.deadline("2020-01-01T00:00:00Z"))
        .isInstanceOf(InvalidJobException.class);
    assertThat(service.deadline("2099-01-01T00:00:00Z")).isAfter(Instant.now());
  }

  @Test
  void validatesCompensationCombinations() {
    assertThatCode(() -> service.validatePagination(0, 50)).doesNotThrowAnyException();
    assertThatThrownBy(() -> service.amount(BigDecimal.ZERO))
        .isInstanceOf(InvalidJobException.class);
    var request = request("FIXED", null, "TRY");
    stubOwner();
    assertThatThrownBy(() -> service.create(principal(), request))
        .isInstanceOf(InvalidJobException.class)
        .extracting("code")
        .isEqualTo("INVALID_JOB_COMPENSATION");
  }

  @Test
  void createsOpenOwnedJobWithNormalizedValues() {
    stubOwner();
    when(jobs.saveAndFlush(any(Job.class))).thenAnswer(call -> call.getArgument(0));
    var response =
        service.create(
            principal(),
            new CreateJobRequest(
                " Editor ",
                " Project ",
                "professional",
                "remote",
                " Istanbul ",
                "fixed",
                new BigDecimal("25000.00"),
                "try",
                "2099-01-01T00:00:00Z"));
    assertThat(response.title()).isEqualTo("Editor");
    assertThat(response.status()).isEqualTo(JobStatus.OPEN);
    assertThat(response.currency()).isEqualTo("TRY");
    assertThat(response.ownedByCurrentUser()).isTrue();
  }

  @Test
  void mapsAuthenticatedAndAnonymousOwnershipAndFilters() {
    when(jobs.findPublicProjected(any(), any(), any(), any()))
        .thenReturn(new PageImpl<>(List.of(row())));
    assertThat(
            service
                .global(0, 20, null, "professional", "remote", principal())
                .content()
                .getFirst()
                .ownedByCurrentUser())
        .isTrue();
    assertThat(
            service
                .global(0, 20, "open", null, null, null)
                .content()
                .getFirst()
                .ownedByCurrentUser())
        .isFalse();
  }

  @Test
  void partialUpdatePreservesMissingAndClearsNullableValues() {
    stubOwnedJob();
    when(jobs.findProjectedById(any())).thenReturn(Optional.of(row()));
    var missing = JobPatchField.<String>missing();
    service.update(
        UUID.randomUUID(),
        principal(),
        new UpdateJobRequest(
            JobPatchField.supplied(" Updated "),
            missing,
            missing,
            missing,
            JobPatchField.supplied(null),
            missing,
            JobPatchField.supplied(null),
            JobPatchField.supplied(null),
            JobPatchField.supplied(null)));
    verify(job)
        .update(
            "Updated",
            "Description",
            JobCategory.PROFESSIONAL,
            WorkMode.REMOTE,
            null,
            CompensationType.NEGOTIABLE,
            null,
            null,
            null);
  }

  @Test
  void patchRevalidatesMergedCompensation() {
    stubOwnedJob();
    var missing = JobPatchField.<String>missing();
    assertThatThrownBy(
            () ->
                service.update(
                    UUID.randomUUID(),
                    principal(),
                    new UpdateJobRequest(
                        missing,
                        missing,
                        missing,
                        missing,
                        missing,
                        JobPatchField.supplied("FIXED"),
                        JobPatchField.supplied(null),
                        missing,
                        missing)))
        .isInstanceOf(InvalidJobException.class);
  }

  @Test
  void closeAndReopenAreIdempotent() {
    stubOwnedJob();
    when(jobs.findProjectedById(any())).thenReturn(Optional.of(row()));
    var id = UUID.randomUUID();
    service.close(id, principal());
    service.close(id, principal());
    service.reopen(id, principal());
    service.reopen(id, principal());
    verify(job, times(2)).close();
    verify(job, times(2)).reopen();
  }

  @Test
  void rejectsNonOwnerUpdateCloseAndDelete() {
    when(jobs.findById(any())).thenReturn(Optional.of(job));
    when(job.getOwner()).thenReturn(user);
    when(user.getId()).thenReturn(UUID.randomUUID());
    assertThatThrownBy(() -> service.close(UUID.randomUUID(), principal()))
        .isInstanceOf(JobUpdateForbiddenException.class);
    assertThatThrownBy(() -> service.delete(UUID.randomUUID(), principal()))
        .isInstanceOf(JobDeleteForbiddenException.class);
  }

  @Test
  void validatesPaginationAndUnsupportedFilters() {
    assertThatThrownBy(() -> service.validatePagination(-1, 20))
        .isInstanceOf(InvalidJobPaginationException.class);
    assertThatThrownBy(() -> service.global(0, 20, "UNKNOWN", null, null, null))
        .isInstanceOf(InvalidJobException.class);
  }

  private void stubOwner() {
    when(users.findById(userId)).thenReturn(Optional.of(user));
    when(user.getId()).thenReturn(userId);
    lenient().when(user.getUsername()).thenReturn("creator");
    lenient().when(user.getFullName()).thenReturn("Creator");
    when(profiles.findByUserId(userId)).thenReturn(Optional.of(profile));
  }

  private void stubOwnedJob() {
    when(jobs.findById(any())).thenReturn(Optional.of(job));
    when(job.getOwner()).thenReturn(user);
    when(user.getId()).thenReturn(userId);
    lenient().when(job.getTitle()).thenReturn("Original");
    lenient().when(job.getDescription()).thenReturn("Description");
    lenient().when(job.getCategory()).thenReturn(JobCategory.PROFESSIONAL);
    lenient().when(job.getWorkMode()).thenReturn(WorkMode.REMOTE);
    lenient().when(job.getCompensationType()).thenReturn(CompensationType.NEGOTIABLE);
  }

  private AuthenticatedUser principal() {
    return new AuthenticatedUser(userId);
  }

  private CreateJobRequest request(String type, BigDecimal amount, String currency) {
    return new CreateJobRequest(
        "Title",
        "Description",
        "PROFESSIONAL",
        "REMOTE",
        null,
        type,
        amount,
        currency,
        "2099-01-01T00:00:00Z");
  }

  private JobRow row() {
    var now = Instant.now();
    return new JobRow(
        UUID.randomUUID(),
        "Job",
        "Description",
        JobCategory.PROFESSIONAL,
        WorkMode.REMOTE,
        null,
        CompensationType.NEGOTIABLE,
        null,
        null,
        JobStatus.OPEN,
        null,
        now,
        now,
        userId,
        "creator",
        "Creator",
        "Director");
  }
}

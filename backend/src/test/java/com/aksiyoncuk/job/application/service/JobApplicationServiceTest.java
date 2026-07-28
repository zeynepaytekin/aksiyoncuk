package com.aksiyoncuk.job.application.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.aksiyoncuk.auth.security.AuthenticatedUser;
import com.aksiyoncuk.job.application.dto.*;
import com.aksiyoncuk.job.application.entity.*;
import com.aksiyoncuk.job.application.exception.*;
import com.aksiyoncuk.job.application.repository.*;
import com.aksiyoncuk.job.entity.*;
import com.aksiyoncuk.job.repository.JobRepository;
import com.aksiyoncuk.user.entity.User;
import com.aksiyoncuk.user.repository.UserRepository;
import java.time.Instant;
import java.util.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class JobApplicationServiceTest {
  @Mock JobApplicationRepository applications;
  @Mock JobRepository jobs;
  @Mock UserRepository users;
  @Mock Job job;
  @Mock User owner;
  @Mock User applicant;
  @Mock JobApplication application;
  JobApplicationService service;
  UUID ownerId;
  UUID applicantId;
  UUID applicationId;

  @BeforeEach
  void setUp() {
    service = new JobApplicationService(applications, jobs, users);
    ownerId = UUID.randomUUID();
    applicantId = UUID.randomUUID();
    applicationId = UUID.randomUUID();
  }

  @Test
  void normalizesCoverLetterAndValidatesLengthAndPagination() {
    assertThat(service.coverLetter(new CreateJobApplicationRequest("  Hello  ")))
        .isEqualTo("Hello");
    assertThat(service.coverLetter(new CreateJobApplicationRequest("   "))).isNull();
    assertThatThrownBy(() -> service.coverLetter(new CreateJobApplicationRequest("x".repeat(5001))))
        .isInstanceOf(InvalidJobApplicationException.class);
    assertThatThrownBy(() -> service.validatePagination(-1, 20))
        .isInstanceOf(InvalidJobApplicationException.class);
  }

  @Test
  void rejectsSelfClosedAndDuplicateApplications() {
    when(jobs.findById(any())).thenReturn(Optional.of(job));
    when(job.getStatus()).thenReturn(JobStatus.OPEN);
    when(job.getOwner()).thenReturn(owner);
    when(owner.getId()).thenReturn(applicantId);
    assertThatThrownBy(
            () ->
                service.apply(
                    UUID.randomUUID(),
                    principal(applicantId),
                    new CreateJobApplicationRequest(null)))
        .isInstanceOf(InvalidJobApplicationException.class)
        .extracting("code")
        .isEqualTo("SELF_APPLICATION_NOT_ALLOWED");
    when(owner.getId()).thenReturn(ownerId);
    when(job.getStatus()).thenReturn(JobStatus.CLOSED);
    assertThatThrownBy(
            () ->
                service.apply(
                    UUID.randomUUID(),
                    principal(applicantId),
                    new CreateJobApplicationRequest(null)))
        .isInstanceOf(InvalidJobApplicationException.class)
        .extracting("code")
        .isEqualTo("JOB_NOT_OPEN");
    when(job.getStatus()).thenReturn(JobStatus.OPEN);
    when(applications.existsByJobIdAndApplicantId(any(), eq(applicantId))).thenReturn(true);
    assertThatThrownBy(
            () ->
                service.apply(
                    UUID.randomUUID(),
                    principal(applicantId),
                    new CreateJobApplicationRequest(null)))
        .isInstanceOf(JobApplicationConflictException.class);
  }

  @Test
  void createsApplicationAndMapsApplicantOwnership() {
    when(jobs.findById(any())).thenReturn(Optional.of(job));
    when(job.getStatus()).thenReturn(JobStatus.OPEN);
    when(job.getOwner()).thenReturn(owner);
    when(owner.getId()).thenReturn(ownerId);
    when(users.findById(applicantId)).thenReturn(Optional.of(applicant));
    when(applications.saveAndFlush(any())).thenReturn(application);
    when(application.getId()).thenReturn(applicationId);
    when(applications.findProjectedById(applicationId)).thenReturn(Optional.of(row()));
    var response =
        service.apply(
            UUID.randomUUID(), principal(applicantId), new CreateJobApplicationRequest(" Letter "));
    assertThat(response.ownedByCurrentApplicant()).isTrue();
    assertThat(response.manageableByCurrentJobOwner()).isFalse();
  }

  @Test
  void applicantAndOwnerCanViewButUnrelatedUserCannot() {
    when(applications.findProjectedById(applicationId)).thenReturn(Optional.of(row()));
    assertThat(service.find(applicationId, principal(applicantId)).ownedByCurrentApplicant())
        .isTrue();
    assertThat(service.find(applicationId, principal(ownerId)).manageableByCurrentJobOwner())
        .isTrue();
    assertThatThrownBy(() -> service.find(applicationId, principal(UUID.randomUUID())))
        .isInstanceOf(ForbiddenJobApplicationException.class);
  }

  @Test
  void withdrawIsSuccessfulAndRepeatedWithdrawalIsIdempotent() {
    stubApplication(JobApplicationStatus.SUBMITTED, applicantId);
    when(applications.findProjectedById(applicationId)).thenReturn(Optional.of(row()));
    service.withdraw(applicationId, principal(applicantId));
    verify(application).withdraw();
    when(application.getStatus()).thenReturn(JobApplicationStatus.WITHDRAWN);
    service.withdraw(applicationId, principal(applicantId));
    verify(application, times(1)).withdraw();
  }

  @Test
  void acceptRejectAndConflictingTerminalTransitionsAreEnforced() {
    stubApplication(JobApplicationStatus.SUBMITTED, applicantId);
    when(application.getJob()).thenReturn(job);
    when(job.getOwner()).thenReturn(owner);
    when(owner.getId()).thenReturn(ownerId);
    when(users.findById(ownerId)).thenReturn(Optional.of(owner));
    when(applications.findProjectedById(applicationId)).thenReturn(Optional.of(row()));
    service.accept(applicationId, principal(ownerId));
    verify(application).accept(owner);
    when(application.getStatus()).thenReturn(JobApplicationStatus.ACCEPTED);
    service.accept(applicationId, principal(ownerId));
    verify(application, times(1)).accept(owner);
    assertThatThrownBy(() -> service.reject(applicationId, principal(ownerId)))
        .isInstanceOf(InvalidJobApplicationException.class);
  }

  @Test
  void nonApplicantAndNonOwnerTransitionsAreForbidden() {
    stubApplication(JobApplicationStatus.SUBMITTED, applicantId);
    when(application.getJob()).thenReturn(job);
    when(job.getOwner()).thenReturn(owner);
    when(owner.getId()).thenReturn(ownerId);
    assertThatThrownBy(() -> service.withdraw(applicationId, principal(UUID.randomUUID())))
        .isInstanceOf(ForbiddenJobApplicationException.class);
    assertThatThrownBy(() -> service.accept(applicationId, principal(UUID.randomUUID())))
        .isInstanceOf(ForbiddenJobApplicationException.class);
  }

  private void stubApplication(JobApplicationStatus status, UUID applicantUserId) {
    when(applications.findById(applicationId)).thenReturn(Optional.of(application));
    lenient().when(application.getApplicant()).thenReturn(applicant);
    lenient().when(applicant.getId()).thenReturn(applicantUserId);
    lenient().when(application.getStatus()).thenReturn(status);
  }

  private AuthenticatedUser principal(UUID id) {
    return new AuthenticatedUser(id);
  }

  private JobApplicationRow row() {
    var now = Instant.now();
    return new JobApplicationRow(
        applicationId,
        JobApplicationStatus.SUBMITTED,
        "Letter",
        now,
        now,
        null,
        null,
        UUID.randomUUID(),
        "Editor",
        JobStatus.OPEN,
        ownerId,
        "owner",
        "Owner",
        "Director",
        applicantId,
        "applicant",
        "Applicant",
        "Editor");
  }
}

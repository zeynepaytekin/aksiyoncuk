package com.aksiyoncuk.job.application.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.aksiyoncuk.auth.repository.RefreshTokenRepository;
import com.aksiyoncuk.job.application.repository.JobApplicationRepository;
import com.aksiyoncuk.job.repository.JobRepository;
import com.aksiyoncuk.profile.repository.ProfileRepository;
import com.aksiyoncuk.user.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.*;
import org.springframework.test.web.servlet.*;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("integration-test")
@Testcontainers
class JobApplicationIntegrationTest {
  @Container
  static final PostgreSQLContainer<?> POSTGRES =
      new PostgreSQLContainer<>("postgres:17")
          .withDatabaseName("aksiyoncuk")
          .withUsername("aksiyoncuk")
          .withPassword("integration_test_only");

  @DynamicPropertySource
  static void properties(DynamicPropertyRegistry registry) {
    registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
    registry.add("spring.datasource.username", POSTGRES::getUsername);
    registry.add("spring.datasource.password", POSTGRES::getPassword);
    registry.add("spring.datasource.driver-class-name", POSTGRES::getDriverClassName);
    registry.add(
        "app.jwt.access-secret", () -> "job-application-integration-secret-at-least-32-bytes");
  }

  @Autowired MockMvc mvc;
  @Autowired ObjectMapper mapper;
  @Autowired JobApplicationRepository applications;
  @Autowired JobRepository jobs;
  @Autowired RefreshTokenRepository refreshTokens;
  @Autowired ProfileRepository profiles;
  @Autowired UserRepository users;
  @Autowired JdbcTemplate jdbc;
  String ownerToken;
  String firstToken;
  String secondToken;
  UUID jobId;

  @BeforeEach
  void setUp() throws Exception {
    applications.deleteAll();
    jobs.deleteAll();
    refreshTokens.deleteAll();
    profiles.deleteAll();
    users.deleteAll();
    register("owner@example.com", "jobowner", "Job Owner");
    register("first@example.com", "applicantone", "Applicant One");
    register("second@example.com", "applicanttwo", "Applicant Two");
    ownerToken = login("jobowner");
    firstToken = login("applicantone");
    secondToken = login("applicanttwo");
    jobId = createJob(ownerToken, "Open Editor");
  }

  @Test
  void applyRequiresAuthenticationIsSafeAndUpdatesPublicCount() throws Exception {
    apply(null, jobId, "No auth").andExpect(status().isUnauthorized());
    var body =
        apply(firstToken, jobId, "  I would like to apply.  ")
            .andExpect(status().isCreated())
            .andExpect(header().exists(HttpHeaders.LOCATION))
            .andExpect(jsonPath("$.status").value("SUBMITTED"))
            .andExpect(jsonPath("$.coverLetter").value("I would like to apply."))
            .andExpect(jsonPath("$.ownedByCurrentApplicant").value(true))
            .andExpect(jsonPath("$.manageableByCurrentJobOwner").value(false))
            .andReturn()
            .getResponse()
            .getContentAsString();
    assertThat(body).doesNotContainIgnoringCase("email").doesNotContainIgnoringCase("password");
    mvc.perform(get("/api/v1/jobs/{id}", jobId))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.applicationCount").value(1));
  }

  @Test
  void selfDuplicateAndClosedApplicationsAreRejected() throws Exception {
    apply(ownerToken, jobId, null)
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("SELF_APPLICATION_NOT_ALLOWED"));
    apply(firstToken, jobId, null).andExpect(status().isCreated());
    apply(firstToken, jobId, null)
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("JOB_APPLICATION_ALREADY_EXISTS"));
    mvc.perform(
            post("/api/v1/jobs/{id}/close", jobId)
                .header(HttpHeaders.AUTHORIZATION, bearer(ownerToken)))
        .andExpect(status().isOk());
    apply(secondToken, jobId, null)
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("JOB_NOT_OPEN"));
  }

  @Test
  void applicantAndOwnerListingsAndSinglePermissionsAreScoped() throws Exception {
    var first = applicationId(apply(firstToken, jobId, "First"));
    apply(secondToken, jobId, "Second").andExpect(status().isCreated());
    mvc.perform(
            get("/api/v1/job-applications/me")
                .header(HttpHeaders.AUTHORIZATION, bearer(firstToken)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.totalElements").value(1))
        .andExpect(jsonPath("$.content[0].applicant.username").value("applicantone"));
    mvc.perform(
            get("/api/v1/jobs/{id}/applications", jobId)
                .header(HttpHeaders.AUTHORIZATION, bearer(ownerToken)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.totalElements").value(2))
        .andExpect(jsonPath("$.content[0].manageableByCurrentJobOwner").value(true));
    mvc.perform(
            get("/api/v1/jobs/{id}/applications", jobId)
                .header(HttpHeaders.AUTHORIZATION, bearer(firstToken)))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("JOB_APPLICATIONS_VIEW_FORBIDDEN"));
    mvc.perform(
            get("/api/v1/job-applications/{id}", first)
                .header(HttpHeaders.AUTHORIZATION, bearer(firstToken)))
        .andExpect(status().isOk());
    mvc.perform(
            get("/api/v1/job-applications/{id}", first)
                .header(HttpHeaders.AUTHORIZATION, bearer(ownerToken)))
        .andExpect(status().isOk());
    mvc.perform(
            get("/api/v1/job-applications/{id}", first)
                .header(HttpHeaders.AUTHORIZATION, bearer(secondToken)))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("JOB_APPLICATION_VIEW_FORBIDDEN"));
  }

  @Test
  void withdrawAcceptRejectAndTerminalRulesWork() throws Exception {
    var withdrawn = applicationId(apply(firstToken, jobId, "Withdraw"));
    mvc.perform(
            post("/api/v1/job-applications/{id}/withdraw", withdrawn)
                .header(HttpHeaders.AUTHORIZATION, bearer(firstToken)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("WITHDRAWN"))
        .andExpect(jsonPath("$.withdrawnAt").isNotEmpty());
    mvc.perform(
            post("/api/v1/job-applications/{id}/withdraw", withdrawn)
                .header(HttpHeaders.AUTHORIZATION, bearer(firstToken)))
        .andExpect(status().isOk());
    mvc.perform(
            post("/api/v1/job-applications/{id}/accept", withdrawn)
                .header(HttpHeaders.AUTHORIZATION, bearer(ownerToken)))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("INVALID_JOB_APPLICATION_TRANSITION"));

    var otherJob = createJob(ownerToken, "Review Job");
    var accepted = applicationId(apply(firstToken, otherJob, "Accept"));
    var rejected = applicationId(apply(secondToken, otherJob, "Reject"));
    mvc.perform(
            post("/api/v1/job-applications/{id}/accept", accepted)
                .header(HttpHeaders.AUTHORIZATION, bearer(ownerToken)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("ACCEPTED"))
        .andExpect(jsonPath("$.reviewedAt").isNotEmpty());
    mvc.perform(
            post("/api/v1/job-applications/{id}/accept", accepted)
                .header(HttpHeaders.AUTHORIZATION, bearer(ownerToken)))
        .andExpect(status().isOk());
    mvc.perform(
            post("/api/v1/job-applications/{id}/reject", rejected)
                .header(HttpHeaders.AUTHORIZATION, bearer(ownerToken)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("REJECTED"));
    mvc.perform(
            get("/api/v1/job-applications/me?status=ACCEPTED")
                .header(HttpHeaders.AUTHORIZATION, bearer(firstToken)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.totalElements").value(1));
  }

  @Test
  void malformedMissingPaginationAndCascadesAreVerifiedWithV10() throws Exception {
    mvc.perform(
            get("/api/v1/job-applications/not-a-uuid")
                .header(HttpHeaders.AUTHORIZATION, bearer(firstToken)))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("MALFORMED_REQUEST"));
    mvc.perform(
            get("/api/v1/job-applications/{id}", UUID.randomUUID())
                .header(HttpHeaders.AUTHORIZATION, bearer(firstToken)))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("JOB_APPLICATION_NOT_FOUND"));
    mvc.perform(
            get("/api/v1/job-applications/me?size=51")
                .header(HttpHeaders.AUTHORIZATION, bearer(firstToken)))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("INVALID_PAGINATION"));
    apply(firstToken, jobId, null).andExpect(status().isCreated());
    assertThat(applications.countByJobId(jobId)).isOne();
    jobs.deleteById(jobId);
    jobs.flush();
    assertThat(applications.countByJobId(jobId)).isZero();
    var cascadeJob = createJob(ownerToken, "Applicant Cascade");
    apply(firstToken, cascadeJob, null).andExpect(status().isCreated());
    var applicant = users.findByUsername("applicantone").orElseThrow();
    users.delete(applicant);
    users.flush();
    assertThat(applications.countByApplicantId(applicant.getId())).isZero();
    assertThat(
            jdbc.queryForObject(
                "SELECT version FROM flyway_schema_history WHERE success ORDER BY installed_rank DESC LIMIT 1",
                String.class))
        .isEqualTo("11");
  }

  private ResultActions apply(String token, UUID id, String letter) throws Exception {
    var builder =
        post("/api/v1/jobs/{id}/applications", id)
            .contentType(MediaType.APPLICATION_JSON)
            .content(mapper.writeValueAsString(Collections.singletonMap("coverLetter", letter)));
    if (token != null) builder.header(HttpHeaders.AUTHORIZATION, bearer(token));
    return mvc.perform(builder);
  }

  private UUID applicationId(ResultActions result) throws Exception {
    return UUID.fromString(
        mapper
            .readTree(
                result
                    .andExpect(status().isCreated())
                    .andReturn()
                    .getResponse()
                    .getContentAsString())
            .path("id")
            .asText());
  }

  private UUID createJob(String token, String title) throws Exception {
    var body =
        Map.of(
            "title",
            title,
            "description",
            "Description",
            "category",
            "PROFESSIONAL",
            "workMode",
            "REMOTE",
            "compensationType",
            "UNPAID");
    var result =
        mvc.perform(
                post("/api/v1/jobs")
                    .header(HttpHeaders.AUTHORIZATION, bearer(token))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(mapper.writeValueAsString(body)))
            .andExpect(status().isCreated())
            .andReturn();
    return UUID.fromString(
        mapper.readTree(result.getResponse().getContentAsString()).path("id").asText());
  }

  private void register(String email, String username, String fullName) throws Exception {
    mvc.perform(
            post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    mapper.writeValueAsString(
                        Map.of(
                            "email",
                            email,
                            "username",
                            username,
                            "password",
                            "ExamplePassword123!",
                            "fullName",
                            fullName))))
        .andExpect(status().isCreated());
  }

  private String login(String identifier) throws Exception {
    var result =
        mvc.perform(
                post("/api/v1/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        mapper.writeValueAsString(
                            Map.of("identifier", identifier, "password", "ExamplePassword123!"))))
            .andExpect(status().isOk())
            .andReturn();
    return mapper.readTree(result.getResponse().getContentAsString()).path("accessToken").asText();
  }

  private String bearer(String token) {
    return "Bearer " + token;
  }
}

package com.aksiyoncuk.job.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.aksiyoncuk.auth.repository.RefreshTokenRepository;
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
class JobIntegrationTest {
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
        "app.jwt.access-secret", () -> "job-integration-test-secret-with-at-least-32-bytes");
  }

  @Autowired MockMvc mvc;
  @Autowired ObjectMapper mapper;
  @Autowired JobRepository jobs;
  @Autowired RefreshTokenRepository refreshTokens;
  @Autowired ProfileRepository profiles;
  @Autowired UserRepository users;
  @Autowired JdbcTemplate jdbc;
  String firstToken;
  String secondToken;

  @BeforeEach
  void setUp() throws Exception {
    jobs.deleteAll();
    refreshTokens.deleteAll();
    profiles.deleteAll();
    users.deleteAll();
    register("first@example.com", "firstuser", "First User");
    register("second@example.com", "seconduser", "Second User");
    firstToken = login("first@example.com");
    secondToken = login("seconduser");
  }

  @Test
  void createRequiresAuthenticationAndReturnsSafeOpenJob() throws Exception {
    create(null, "No auth", "PROFESSIONAL", "REMOTE", "FIXED", 100, "TRY")
        .andExpect(status().isUnauthorized());
    var body =
        create(firstToken, " Editor ", "PROFESSIONAL", "REMOTE", "FIXED", 25000, "try")
            .andExpect(status().isCreated())
            .andExpect(header().exists(HttpHeaders.LOCATION))
            .andExpect(jsonPath("$.title").value("Editor"))
            .andExpect(jsonPath("$.currency").value("TRY"))
            .andExpect(jsonPath("$.status").value("OPEN"))
            .andExpect(jsonPath("$.ownedByCurrentUser").value(true))
            .andReturn()
            .getResponse()
            .getContentAsString();
    assertThat(body).doesNotContainIgnoringCase("email").doesNotContainIgnoringCase("password");
  }

  @Test
  void globalFiltersDefaultOpenAndMineIsOwnerScopedNewestFirst() throws Exception {
    var older = id(create(firstToken, "Older", "STUDENT", "ONSITE", "UNPAID", null, null));
    var closed =
        id(create(firstToken, "Closed", "PROFESSIONAL", "REMOTE", "NEGOTIABLE", null, null));
    var other = id(create(secondToken, "Other", "PROFESSIONAL", "HYBRID", "UNPAID", null, null));
    mvc.perform(
            post("/api/v1/jobs/{id}/close", closed)
                .header(HttpHeaders.AUTHORIZATION, bearer(firstToken)))
        .andExpect(status().isOk());
    jdbc.update(
        "UPDATE jobs SET created_at=TIMESTAMPTZ '2020-01-01 00:00:00+00' WHERE id=?", older);

    mvc.perform(get("/api/v1/jobs"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.totalElements").value(2))
        .andExpect(jsonPath("$.content[0].id").value(other.toString()))
        .andExpect(jsonPath("$.content[0].ownedByCurrentUser").value(false));
    mvc.perform(get("/api/v1/jobs?status=CLOSED&category=PROFESSIONAL&workMode=REMOTE"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.totalElements").value(1))
        .andExpect(jsonPath("$.content[0].title").value("Closed"));
    mvc.perform(get("/api/v1/jobs/me").header(HttpHeaders.AUTHORIZATION, bearer(firstToken)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.totalElements").value(2));
  }

  @Test
  void ownerUpdatesClosesReopensAndNonOwnerIsForbidden() throws Exception {
    var id =
        id(create(firstToken, "Original", "PROFESSIONAL", "REMOTE", "NEGOTIABLE", null, "TRY"));
    mvc.perform(
            patch("/api/v1/jobs/{id}", id)
                .header(HttpHeaders.AUTHORIZATION, bearer(firstToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\" Updated \",\"location\":null,\"currency\":null}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.title").value("Updated"))
        .andExpect(jsonPath("$.location").value((Object) null));
    mvc.perform(
            patch("/api/v1/jobs/{id}", id)
                .header(HttpHeaders.AUTHORIZATION, bearer(secondToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"No\"}"))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("JOB_UPDATE_FORBIDDEN"));
    mvc.perform(
            post("/api/v1/jobs/{id}/close", id)
                .header(HttpHeaders.AUTHORIZATION, bearer(firstToken)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("CLOSED"));
    mvc.perform(
            post("/api/v1/jobs/{id}/close", id)
                .header(HttpHeaders.AUTHORIZATION, bearer(firstToken)))
        .andExpect(status().isOk());
    mvc.perform(
            post("/api/v1/jobs/{id}/reopen", id)
                .header(HttpHeaders.AUTHORIZATION, bearer(firstToken)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("OPEN"));
  }

  @Test
  void deleteOwnershipValidationMalformedAndMissingAreStructured() throws Exception {
    var id = id(create(firstToken, "Owned", "AMATEUR", "HYBRID", "UNPAID", null, null));
    mvc.perform(
            delete("/api/v1/jobs/{id}", id).header(HttpHeaders.AUTHORIZATION, bearer(secondToken)))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("JOB_DELETE_FORBIDDEN"));
    mvc.perform(
            delete("/api/v1/jobs/{id}", id).header(HttpHeaders.AUTHORIZATION, bearer(firstToken)))
        .andExpect(status().isNoContent());
    assertThat(jobs.existsById(id)).isFalse();
    mvc.perform(get("/api/v1/jobs/not-a-uuid"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("MALFORMED_REQUEST"));
    mvc.perform(get("/api/v1/jobs/{id}", UUID.randomUUID()))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("JOB_NOT_FOUND"));
    mvc.perform(get("/api/v1/jobs?page=-1"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("INVALID_PAGINATION"));
  }

  @Test
  void compensationCurrencyDeadlineCascadeAndFlywayAreVerified() throws Exception {
    create(firstToken, "Bad fixed", "PROFESSIONAL", "REMOTE", "FIXED", null, "TRY")
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("INVALID_JOB_COMPENSATION"));
    create(firstToken, "Bad currency", "PROFESSIONAL", "REMOTE", "NEGOTIABLE", null, "EURO")
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("INVALID_JOB_CURRENCY"));
    mvc.perform(
            post("/api/v1/jobs")
                .header(HttpHeaders.AUTHORIZATION, bearer(firstToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
            {"title":"Past","description":"Description","category":"STUDENT","workMode":"REMOTE",
             "compensationType":"UNPAID","applicationDeadline":"2020-01-01T00:00:00Z"}
            """))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("INVALID_JOB_DEADLINE"));
    create(firstToken, "Cascade", "STUDENT", "REMOTE", "UNPAID", null, null);
    var user = users.findByUsername("firstuser").orElseThrow();
    assertThat(jobs.countByOwnerId(user.getId())).isOne();
    users.delete(user);
    users.flush();
    assertThat(jobs.countByOwnerId(user.getId())).isZero();
    assertThat(
            jdbc.queryForObject(
                "SELECT version FROM flyway_schema_history WHERE success ORDER BY installed_rank DESC LIMIT 1",
                String.class))
        .isEqualTo("11");
  }

  private ResultActions create(
      String token,
      String title,
      String category,
      String mode,
      String compensation,
      Integer amount,
      String currency)
      throws Exception {
    var values = new LinkedHashMap<String, Object>();
    values.put("title", title);
    values.put("description", "Project description");
    values.put("category", category);
    values.put("workMode", mode);
    values.put("compensationType", compensation);
    if (amount != null) values.put("compensationAmount", amount);
    if (currency != null) values.put("currency", currency);
    var request =
        post("/api/v1/jobs")
            .contentType(MediaType.APPLICATION_JSON)
            .content(mapper.writeValueAsString(values));
    if (token != null) request.header(HttpHeaders.AUTHORIZATION, bearer(token));
    return mvc.perform(request);
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

  private UUID id(ResultActions result) throws Exception {
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

  private String bearer(String token) {
    return "Bearer " + token;
  }
}

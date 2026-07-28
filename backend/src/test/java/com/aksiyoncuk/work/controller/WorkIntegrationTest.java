package com.aksiyoncuk.work.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.aksiyoncuk.auth.repository.RefreshTokenRepository;
import com.aksiyoncuk.profile.repository.ProfileRepository;
import com.aksiyoncuk.user.repository.UserRepository;
import com.aksiyoncuk.work.repository.WorkRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Year;
import java.time.ZoneOffset;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("integration-test")
@Testcontainers
class WorkIntegrationTest {

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
        "app.jwt.access-secret", () -> "work-integration-test-secret-with-at-least-32-bytes");
  }

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private WorkRepository workRepository;
  @Autowired private RefreshTokenRepository refreshTokenRepository;
  @Autowired private ProfileRepository profileRepository;
  @Autowired private UserRepository userRepository;
  @Autowired private JdbcTemplate jdbcTemplate;

  private String firstToken;
  private String secondToken;

  @BeforeEach
  void setUp() throws Exception {
    workRepository.deleteAll();
    refreshTokenRepository.deleteAll();
    profileRepository.deleteAll();
    userRepository.deleteAll();
    register("first@example.com", "firstuser", "First User");
    register("second@example.com", "seconduser", "Second User");
    firstToken = login("first@example.com");
    secondToken = login("seconduser");
  }

  @Test
  void createRequiresAuthenticationAndReturnsSafeCreatedResponse() throws Exception {
    create(null, "No token", "FILM", null, null).andExpect(status().isUnauthorized());

    var result =
        create(firstToken, "  My Short Film  ", "SHORT_FILM", "https://example.com/work", 2026)
            .andExpect(status().isCreated())
            .andExpect(
                header()
                    .string(
                        HttpHeaders.LOCATION,
                        org.hamcrest.Matchers.containsString("/api/v1/works/")))
            .andExpect(jsonPath("$.title").value("My Short Film"))
            .andExpect(jsonPath("$.workType").value("SHORT_FILM"))
            .andExpect(jsonPath("$.owner.username").value("firstuser"))
            .andExpect(jsonPath("$.ownedByCurrentUser").value(true))
            .andReturn();
    assertThat(result.getResponse().getContentAsString())
        .doesNotContainIgnoringCase("email")
        .doesNotContainIgnoringCase("password");
  }

  @Test
  void currentAndPublicListsAreScopedSafeNormalizedAndNewestFirst() throws Exception {
    var older = createdId(create(firstToken, "Older", "FILM", null, 2020));
    var newer = createdId(create(firstToken, "Newer", "DOCUMENTARY", null, 2021));
    create(secondToken, "Other owner", "SERIES", null, null);
    jdbcTemplate.update(
        "UPDATE works SET created_at = TIMESTAMPTZ '2020-01-01 00:00:00+00' WHERE id = ?", older);
    jdbcTemplate.update(
        "UPDATE works SET created_at = TIMESTAMPTZ '2021-01-01 00:00:00+00' WHERE id = ?", newer);

    mockMvc
        .perform(get("/api/v1/works/me").header(HttpHeaders.AUTHORIZATION, bearer(firstToken)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.totalElements").value(2))
        .andExpect(jsonPath("$.content[0].title").value("Newer"))
        .andExpect(jsonPath("$.content[0].ownedByCurrentUser").value(true));

    var publicBody =
        mockMvc
            .perform(get("/api/v1/users/{username}/works", "FIRSTUSER"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.totalElements").value(2))
            .andExpect(jsonPath("$.content[0].ownedByCurrentUser").value(false))
            .andReturn()
            .getResponse()
            .getContentAsString();
    assertThat(publicBody).doesNotContainIgnoringCase("email");

    mockMvc
        .perform(
            get("/api/v1/users/{username}/works", "firstuser")
                .header(HttpHeaders.AUTHORIZATION, bearer(firstToken)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content[0].ownedByCurrentUser").value(true));
  }

  @Test
  void singleWorkIsPublicAndUnknownUsernameIsStructured() throws Exception {
    var workId = createdId(create(firstToken, "Public work", "THEATRE", null, null));
    mockMvc
        .perform(get("/api/v1/works/{workId}", workId))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.title").value("Public work"))
        .andExpect(jsonPath("$.ownedByCurrentUser").value(false));
    mockMvc
        .perform(get("/api/v1/users/unknown/works"))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("PROFILE_NOT_FOUND"));
  }

  @Test
  void ownerCanPartiallyUpdateAndClearNullableFields() throws Exception {
    var workId =
        createdId(create(firstToken, "Original", "FILM", "https://example.com/original", 2020));
    mockMvc
        .perform(
            patch("/api/v1/works/{workId}", workId)
                .header(HttpHeaders.AUTHORIZATION, bearer(firstToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {
                      "title": " Updated ",
                      "description": null,
                      "projectUrl": null,
                      "releaseYear": null
                    }
                    """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.title").value("Updated"))
        .andExpect(jsonPath("$.description").value((Object) null))
        .andExpect(jsonPath("$.projectUrl").value((Object) null))
        .andExpect(jsonPath("$.releaseYear").value((Object) null))
        .andExpect(jsonPath("$.workType").value("FILM"));

    var row =
        jdbcTemplate.queryForMap(
            "SELECT title, description, project_url, release_year FROM works WHERE id = ?", workId);
    assertThat(row.get("title")).isEqualTo("Updated");
    assertThat(row.get("description")).isNull();
    assertThat(row.get("project_url")).isNull();
    assertThat(row.get("release_year")).isNull();
  }

  @Test
  void updateAndDeleteEnforceOwnership() throws Exception {
    var workId = createdId(create(firstToken, "Owned", "COMMERCIAL", null, null));
    mockMvc
        .perform(
            patch("/api/v1/works/{workId}", workId)
                .header(HttpHeaders.AUTHORIZATION, bearer(secondToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"Not mine\"}"))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("WORK_UPDATE_FORBIDDEN"));
    mockMvc
        .perform(
            delete("/api/v1/works/{workId}", workId)
                .header(HttpHeaders.AUTHORIZATION, bearer(secondToken)))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("WORK_DELETE_FORBIDDEN"));
    mockMvc
        .perform(
            delete("/api/v1/works/{workId}", workId)
                .header(HttpHeaders.AUTHORIZATION, bearer(firstToken)))
        .andExpect(status().isNoContent());
    assertThat(workRepository.existsById(workId)).isFalse();
  }

  @Test
  void validationMalformedMissingAndPaginationErrorsAreStructured() throws Exception {
    var maximumYear = Year.now(ZoneOffset.UTC).getValue() + 5;
    create(firstToken, "Invalid URL", "FILM", "javascript:bad", null)
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("INVALID_WORK_URL"));
    create(firstToken, "Invalid year", "FILM", null, maximumYear + 1)
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("INVALID_WORK_YEAR"));
    create(firstToken, "Invalid type", "NOT_REAL", null, null)
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("INVALID_WORK_TYPE"));
    mockMvc
        .perform(get("/api/v1/works/not-a-uuid"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("MALFORMED_REQUEST"));
    mockMvc
        .perform(get("/api/v1/works/{workId}", UUID.randomUUID()))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("WORK_NOT_FOUND"));
    mockMvc
        .perform(
            get("/api/v1/works/me?page=-1").header(HttpHeaders.AUTHORIZATION, bearer(firstToken)))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("INVALID_PAGINATION"));
  }

  @Test
  void userDeletionCascadesWorksAndFlywayReachesV9() throws Exception {
    create(firstToken, "Cascade", "OTHER", null, null);
    var user = userRepository.findByUsername("firstuser").orElseThrow();
    assertThat(workRepository.countByOwnerId(user.getId())).isOne();
    userRepository.delete(user);
    userRepository.flush();
    assertThat(workRepository.countByOwnerId(user.getId())).isZero();

    assertThat(
            jdbcTemplate.queryForObject(
                "SELECT max(version) FROM flyway_schema_history WHERE success", String.class))
        .isEqualTo("9");
  }

  private org.springframework.test.web.servlet.ResultActions create(
      String token, String title, String type, String projectUrl, Integer releaseYear)
      throws Exception {
    var builder =
        post("/api/v1/works")
            .contentType(MediaType.APPLICATION_JSON)
            .content(
                objectMapper.writeValueAsString(
                    Map.of(
                        "title",
                        title,
                        "workType",
                        type,
                        "description",
                        "Description",
                        "projectUrl",
                        projectUrl == null ? "" : projectUrl,
                        "releaseYear",
                        releaseYear == null ? 2026 : releaseYear)));
    if (token != null) builder.header(HttpHeaders.AUTHORIZATION, bearer(token));
    return mockMvc.perform(builder);
  }

  private void register(String email, String username, String fullName) throws Exception {
    mockMvc
        .perform(
            post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    objectMapper.writeValueAsString(
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
        mockMvc
            .perform(
                post("/api/v1/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        objectMapper.writeValueAsString(
                            Map.of("identifier", identifier, "password", "ExamplePassword123!"))))
            .andExpect(status().isOk())
            .andReturn();
    return objectMapper
        .readTree(result.getResponse().getContentAsString())
        .path("accessToken")
        .asText();
  }

  private UUID createdId(org.springframework.test.web.servlet.ResultActions result)
      throws Exception {
    return UUID.fromString(
        objectMapper
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

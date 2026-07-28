package com.aksiyoncuk.search.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
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
class SearchIntegrationTest {

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
        "app.jwt.access-secret", () -> "search-integration-test-secret-with-at-least-32-bytes");
  }

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private JdbcTemplate jdbc;

  private UUID ownerId;
  private UUID viewerId;
  private String viewerToken;

  @BeforeEach
  void setUp() throws Exception {
    jdbc.execute("truncate table users cascade");
    register("director@example.com", "film_director", "Film Director");
    register("viewer@example.com", "search_viewer", "Search Viewer");
    ownerId = id("film_director");
    viewerId = id("search_viewer");
    viewerToken = login("viewer@example.com");
    jdbc.update(
        "update profiles set professional_title='Award Editor', location='Istanbul' where user_id=?",
        ownerId);
    jdbc.update(
        "insert into user_follows(id,follower_id,followed_id,created_at) values (?,?,?,now())",
        UUID.randomUUID(),
        viewerId,
        ownerId);
    jdbc.update(
        """
        insert into posts(id,author_id,content,created_at,updated_at)
        values (?,?,?,now(),now())
        """,
        UUID.randomUUID(),
        ownerId,
        "Distinctive montage editor needed");
    jdbc.update(
        """
        insert into works(id,owner_id,title,description,work_type,release_year,created_at,updated_at)
        values (?,?,?,?,?,?,now(),now())
        """,
        UUID.randomUUID(),
        ownerId,
        "Editor Showcase",
        "Distinctive portfolio",
        "SHORT_FILM",
        2026);
    jdbc.update(
        """
        insert into jobs(id,owner_id,title,description,category,work_mode,
          compensation_type,status,created_at,updated_at)
        values (?,?,?,?,?,?,?,?,now(),now())
        """,
        UUID.randomUUID(),
        ownerId,
        "Looking for editor",
        "Distinctive project description",
        "PROFESSIONAL",
        "REMOTE",
        "NEGOTIABLE",
        "OPEN");
  }

  @Test
  void userSearchIsPrivacySafeAndViewerAware() throws Exception {
    mockMvc
        .perform(get("/api/v1/search/users").param("q", "Award Editor"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content[0].username").value("film_director"))
        .andExpect(jsonPath("$.content[0].followedByCurrentUser").value(false))
        .andExpect(jsonPath("$.content[0].email").doesNotExist())
        .andExpect(jsonPath("$.content[0].passwordHash").doesNotExist());

    mockMvc
        .perform(
            get("/api/v1/search/users")
                .param("q", "film")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + viewerToken))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content[0].followedByCurrentUser").value(true));
  }

  @Test
  void resourceSearchAndCombinedSearchReturnTypedSafeGroups() throws Exception {
    mockMvc
        .perform(get("/api/v1/search/posts").param("q", "montage"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content[0].author.email").doesNotExist())
        .andExpect(jsonPath("$.content[0].ownedByCurrentUser").value(false));
    mockMvc
        .perform(get("/api/v1/search/works").param("q", "showcase").param("workType", "SHORT_FILM"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.totalElements").value(1));
    mockMvc
        .perform(
            get("/api/v1/search/jobs")
                .param("q", "editor")
                .param("category", "PROFESSIONAL")
                .param("workMode", "REMOTE"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content[0].applicationCount").value(0));
    mockMvc
        .perform(get("/api/v1/search").param("q", "editor").param("limitPerType", "2"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.query").value("editor"))
        .andExpect(jsonPath("$.users.totalElements").isNumber())
        .andExpect(jsonPath("$.posts.totalElements").isNumber())
        .andExpect(jsonPath("$.works.totalElements").isNumber())
        .andExpect(jsonPath("$.jobs.totalElements").isNumber());
  }

  @Test
  void defaultsJobsToOpenAndTreatsWildcardsLiterally() throws Exception {
    jdbc.update(
        """
        insert into jobs(id,owner_id,title,description,category,work_mode,
          compensation_type,status,created_at,updated_at)
        values (?,?,?,?,?,?,?,?,now(),now())
        """,
        UUID.randomUUID(),
        ownerId,
        "Closed editor role",
        "Closed listing",
        "PROFESSIONAL",
        "REMOTE",
        "UNPAID",
        "CLOSED");

    mockMvc
        .perform(get("/api/v1/search/jobs").param("q", "editor"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.totalElements").value(1));
    mockMvc
        .perform(get("/api/v1/search/users").param("q", "%_"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.totalElements").value(0));
  }

  @Test
  void invalidQueriesPaginationAndFiltersAreStructured() throws Exception {
    mockMvc
        .perform(get("/api/v1/search/users").param("q", "x"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("INVALID_SEARCH_QUERY"));
    mockMvc
        .perform(get("/api/v1/search/posts").param("q", "editor").param("size", "51"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("INVALID_SEARCH_PAGINATION"));
    mockMvc
        .perform(get("/api/v1/search/works").param("q", "editor").param("workType", "UNKNOWN"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("INVALID_SEARCH_FILTER"));
  }

  private void register(String email, String username, String fullName) throws Exception {
    mockMvc
        .perform(
            post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    objectMapper.writeValueAsString(
                        Map.of(
                            "email", email,
                            "username", username,
                            "password", "StrongPassword123!",
                            "fullName", fullName))))
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
                            Map.of("identifier", identifier, "password", "StrongPassword123!"))))
            .andExpect(status().isOk())
            .andReturn();
    return objectMapper
        .readTree(result.getResponse().getContentAsString())
        .get("accessToken")
        .asText();
  }

  private UUID id(String username) {
    return jdbc.queryForObject("select id from users where username=?", UUID.class, username);
  }
}

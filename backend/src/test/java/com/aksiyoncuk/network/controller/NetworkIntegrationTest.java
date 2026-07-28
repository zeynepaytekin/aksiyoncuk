package com.aksiyoncuk.network.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.aksiyoncuk.network.repository.UserFollowRepository;
import com.aksiyoncuk.profile.repository.ProfileRepository;
import com.aksiyoncuk.user.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
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
class NetworkIntegrationTest {
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
    registry.add(
        "app.jwt.access-secret", () -> "network-integration-secret-with-at-least-32-bytes");
  }

  @Autowired private MockMvc mvc;
  @Autowired private ObjectMapper json;
  @Autowired private UserFollowRepository follows;
  @Autowired private ProfileRepository profiles;
  @Autowired private UserRepository users;
  @Autowired private JdbcTemplate jdbc;

  private String tokenA;
  private String tokenB;
  private String tokenC;

  @BeforeEach
  void setUp() throws Exception {
    follows.deleteAll();
    profiles.deleteAll();
    users.deleteAll();
    tokenA = registerAndLogin("usera", "User A");
    tokenB = registerAndLogin("userb", "User B");
    tokenC = registerAndLogin("userc", "User C");
  }

  @Test
  void followIsAuthenticatedIdempotentAndUpdatesProfiles() throws Exception {
    mvc.perform(put("/api/v1/users/userb/follow")).andExpect(status().isUnauthorized());

    follow("USERB", tokenA)
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.followedByCurrentUser").value(true))
        .andExpect(jsonPath("$.followerCount").value(1));
    follow(" userb ", tokenA).andExpect(status().isOk());

    assertThat(jdbc.queryForObject("select count(*) from user_follows", Long.class)).isEqualTo(1);

    mvc.perform(get("/api/v1/profiles/userb"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.followerCount").value(1))
        .andExpect(jsonPath("$.followingCount").value(0))
        .andExpect(jsonPath("$.followedByCurrentUser").value(false))
        .andExpect(jsonPath("$.email").doesNotExist())
        .andExpect(jsonPath("$.passwordHash").doesNotExist());

    mvc.perform(get("/api/v1/profiles/userb").header(HttpHeaders.AUTHORIZATION, bearer(tokenA)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.followedByCurrentUser").value(true));

    mvc.perform(get("/api/v1/profiles/me").header(HttpHeaders.AUTHORIZATION, bearer(tokenA)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.followingCount").value(1))
        .andExpect(jsonPath("$.followedByCurrentUser").value(false));
  }

  @Test
  void publicListingsExposeSafeViewerSpecificState() throws Exception {
    follow("userb", tokenA);
    follow("userc", tokenA);
    follow("userc", tokenB);

    mvc.perform(get("/api/v1/users/userc/followers"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.totalElements").value(2))
        .andExpect(jsonPath("$.content[0].followedByCurrentUser").value(false))
        .andExpect(jsonPath("$.content[0].email").doesNotExist());

    mvc.perform(
            get("/api/v1/users/userc/followers").header(HttpHeaders.AUTHORIZATION, bearer(tokenA)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content[0].followedByCurrentUser").isBoolean());

    mvc.perform(get("/api/v1/users/usera/following"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.totalElements").value(2))
        .andExpect(jsonPath("$.content[0].passwordHash").doesNotExist());
  }

  @Test
  void mutualSummaryAndUnfollowCountsAreAccurate() throws Exception {
    follow("userb", tokenA);
    follow("usera", tokenB);

    mvc.perform(get("/api/v1/network/me").header(HttpHeaders.AUTHORIZATION, bearer(tokenA)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.followerCount").value(1))
        .andExpect(jsonPath("$.followingCount").value(1))
        .andExpect(jsonPath("$.mutualCount").value(1));

    mvc.perform(
            delete("/api/v1/users/userb/follow").header(HttpHeaders.AUTHORIZATION, bearer(tokenA)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.followedByCurrentUser").value(false))
        .andExpect(jsonPath("$.followerCount").value(0));
    mvc.perform(
            delete("/api/v1/users/userb/follow").header(HttpHeaders.AUTHORIZATION, bearer(tokenA)))
        .andExpect(status().isOk());
    assertThat(follows.count()).isEqualTo(1);
  }

  @Test
  void domainAndPaginationErrorsAreStructured() throws Exception {
    follow("usera", tokenA)
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("SELF_FOLLOW_NOT_ALLOWED"));
    mvc.perform(
            put("/api/v1/users/missing/follow").header(HttpHeaders.AUTHORIZATION, bearer(tokenA)))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("PROFILE_NOT_FOUND"));
    mvc.perform(get("/api/v1/users/usera/followers").param("size", "51"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("INVALID_NETWORK_PAGINATION"));
  }

  @Test
  void deletionCascadesAndFlywayReachesV11() throws Exception {
    follow("userb", tokenA);
    var userA = users.findByUsername("usera").orElseThrow();
    users.delete(userA);
    users.flush();
    assertThat(follows.count()).isZero();
    assertThat(
            jdbc.queryForObject(
                """
                select version from flyway_schema_history
                where success order by installed_rank desc limit 1
                """,
                String.class))
        .isEqualTo("13");
  }

  private org.springframework.test.web.servlet.ResultActions follow(String username, String token)
      throws Exception {
    return mvc.perform(
        put("/api/v1/users/{username}/follow", username)
            .header(HttpHeaders.AUTHORIZATION, bearer(token)));
  }

  private String registerAndLogin(String username, String fullName) throws Exception {
    mvc.perform(
            post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    json.writeValueAsString(
                        Map.of(
                            "email",
                            username + "@example.com",
                            "username",
                            username,
                            "password",
                            "StrongPassword123!",
                            "fullName",
                            fullName))))
        .andExpect(status().isCreated());
    var result =
        mvc.perform(
                post("/api/v1/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        json.writeValueAsString(
                            Map.of("identifier", username, "password", "StrongPassword123!"))))
            .andExpect(status().isOk())
            .andReturn();
    return json.readTree(result.getResponse().getContentAsString()).get("accessToken").asText();
  }

  private String bearer(String token) {
    return "Bearer " + token;
  }
}

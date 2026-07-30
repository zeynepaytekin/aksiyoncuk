package com.aksiyoncuk.auth.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.aksiyoncuk.auth.repository.RefreshTokenRepository;
import com.aksiyoncuk.auth.service.JwtTokenService;
import com.aksiyoncuk.profile.repository.ProfileRepository;
import com.aksiyoncuk.user.repository.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
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
class AuthIntegrationTest {

  private static final String JWT_SECRET = "auth-integration-test-secret-with-at-least-32-bytes";

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
    registry.add("app.jwt.access-secret", () -> JWT_SECRET);
  }

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private RefreshTokenRepository refreshTokenRepository;
  @Autowired private ProfileRepository profileRepository;
  @Autowired private UserRepository userRepository;
  @Autowired private JdbcTemplate jdbcTemplate;

  @BeforeEach
  void setUp() throws Exception {
    refreshTokenRepository.deleteAll();
    profileRepository.deleteAll();
    userRepository.deleteAll();
    register();
  }

  @Test
  void successfulLoginByEmailReturnsTokensWithoutPasswordData() throws Exception {
    var response = login(" USER@EXAMPLE.COM ", "ExamplePassword123!");

    assertThat(response.path("accessToken").asText()).isNotBlank();
    assertThat(response.path("refreshToken").asText()).isNotBlank();
    assertThat(response.path("tokenType").asText()).isEqualTo("Bearer");
    assertThat(response.toString()).doesNotContainIgnoringCase("password");
    assertThat(refreshTokenRepository.count()).isEqualTo(1);
  }

  @Test
  void successfulLoginByUsername() throws Exception {
    var response = login(" CreativeUser ", "ExamplePassword123!");

    assertThat(response.path("user").path("email").asText()).isEqualTo("user@example.com");
  }

  @Test
  void invalidCredentialsReturnUnauthorizedWithoutUserDisclosure() throws Exception {
    mockMvc
        .perform(
            post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(loginBody("missing@example.com", "WrongPassword123!")))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
  }

  @Test
  void currentUserRequiresAndAcceptsAccessToken() throws Exception {
    mockMvc
        .perform(get("/api/v1/auth/me"))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));

    var accessToken = login("user@example.com", "ExamplePassword123!").path("accessToken").asText();
    mockMvc
        .perform(get("/api/v1/auth/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.username").value("creativeuser"))
        .andExpect(jsonPath("$.passwordHash").doesNotExist());
  }

  @Test
  void malformedAndExpiredAccessTokensReturnSpecificErrors() throws Exception {
    mockMvc
        .perform(get("/api/v1/auth/me").header(HttpHeaders.AUTHORIZATION, "Bearer malformed"))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.code").value("INVALID_ACCESS_TOKEN"));

    mockMvc
        .perform(
            get("/api/v1/auth/me")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + expiredAccessToken()))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.code").value("EXPIRED_ACCESS_TOKEN"));
  }

  @Test
  void refreshRotatesTokenAndOldTokenReuseRevokesReplacement() throws Exception {
    var login = login("user@example.com", "ExamplePassword123!");
    var oldToken = login.path("refreshToken").asText();
    var refreshed = refresh(oldToken, 200, null);
    var replacement = refreshed.path("refreshToken").asText();

    refresh(oldToken, 401, "REUSED_REFRESH_TOKEN");
    refresh(replacement, 401, "INVALID_REFRESH_TOKEN");

    var tokens = refreshTokenRepository.findAll();
    assertThat(tokens).hasSize(2);
    assertThat(tokens).allMatch(token -> token.getRevokedAt() != null);
    assertThat(tokens).noneMatch(token -> token.getTokenHash().equals(oldToken));
  }

  @Test
  void logoutIsSuccessfulAndLoggedOutTokenCannotRefresh() throws Exception {
    var refreshToken =
        login("user@example.com", "ExamplePassword123!").path("refreshToken").asText();
    var body = objectMapper.writeValueAsString(java.util.Map.of("refreshToken", refreshToken));

    mockMvc
        .perform(post("/api/v1/auth/logout").contentType(MediaType.APPLICATION_JSON).content(body))
        .andExpect(status().isNoContent());
    mockMvc
        .perform(post("/api/v1/auth/logout").contentType(MediaType.APPLICATION_JSON).content(body))
        .andExpect(status().isNoContent());
    refresh(refreshToken, 401, "INVALID_REFRESH_TOKEN");
  }

  @Test
  void flywayAppliedAllMigrations() {
    var count =
        jdbcTemplate.queryForObject(
            "SELECT count(*) FROM flyway_schema_history WHERE success", Integer.class);
    var version =
        jdbcTemplate.queryForObject(
            "SELECT version FROM flyway_schema_history WHERE success ORDER BY installed_rank DESC LIMIT 1",
            String.class);

    assertThat(count).isEqualTo(15);
    assertThat(version).isEqualTo("15");
  }

  private void register() throws Exception {
    var body =
        """
        {
          "email": "user@example.com",
          "username": "creativeuser",
          "password": "ExamplePassword123!",
          "fullName": "Creative User"
        }
        """;
    mockMvc
        .perform(
            post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON).content(body))
        .andExpect(status().isCreated());
  }

  private JsonNode login(String identifier, String password) throws Exception {
    var result =
        mockMvc
            .perform(
                post("/api/v1/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(loginBody(identifier, password)))
            .andExpect(status().isOk())
            .andReturn();
    return objectMapper.readTree(result.getResponse().getContentAsString());
  }

  private String loginBody(String identifier, String password) throws Exception {
    return objectMapper.writeValueAsString(
        java.util.Map.of("identifier", identifier, "password", password));
  }

  private JsonNode refresh(String token, int expectedStatus, String code) throws Exception {
    var action =
        mockMvc
            .perform(
                post("/api/v1/auth/refresh")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        objectMapper.writeValueAsString(java.util.Map.of("refreshToken", token))))
            .andExpect(status().is(expectedStatus));
    if (code != null) {
      action.andExpect(jsonPath("$.code").value(code));
    }
    return objectMapper.readTree(action.andReturn().getResponse().getContentAsString());
  }

  private String expiredAccessToken() {
    var key = Keys.hmacShaKeyFor(JWT_SECRET.getBytes(StandardCharsets.UTF_8));
    var now = Instant.now();
    return Jwts.builder()
        .issuer(JwtTokenService.ISSUER)
        .audience()
        .add(JwtTokenService.AUDIENCE)
        .and()
        .subject(UUID.randomUUID().toString())
        .id(UUID.randomUUID().toString())
        .issuedAt(Date.from(now.minusSeconds(120)))
        .notBefore(Date.from(now.minusSeconds(120)))
        .expiration(Date.from(now.minusSeconds(60)))
        .claim("token_type", "access")
        .signWith(key, Jwts.SIG.HS256)
        .compact();
  }
}

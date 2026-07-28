package com.aksiyoncuk.profile.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.aksiyoncuk.auth.repository.RefreshTokenRepository;
import com.aksiyoncuk.profile.repository.ProfileRepository;
import com.aksiyoncuk.user.repository.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
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
class ProfileIntegrationTest {

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
        "app.jwt.access-secret", () -> "profile-integration-test-secret-with-at-least-32-bytes");
  }

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private RefreshTokenRepository refreshTokenRepository;
  @Autowired private ProfileRepository profileRepository;
  @Autowired private UserRepository userRepository;
  @Autowired private JdbcTemplate jdbcTemplate;

  private String accessToken;

  @BeforeEach
  void setUp() throws Exception {
    refreshTokenRepository.deleteAll();
    profileRepository.deleteAll();
    userRepository.deleteAll();
    register();
    accessToken = login();
  }

  @Test
  void currentProfileRequiresAuthenticationAndReturnsPrivateData() throws Exception {
    mockMvc
        .perform(get("/api/v1/profiles/me"))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));

    mockMvc
        .perform(get("/api/v1/profiles/me").header(HttpHeaders.AUTHORIZATION, bearer()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.user.email").value("user@example.com"))
        .andExpect(jsonPath("$.user.username").value("creativeuser"))
        .andExpect(jsonPath("$.passwordHash").doesNotExist());
  }

  @Test
  void patchUpdatesUserAndProfileFields() throws Exception {
    patchProfile(
        """
        {
          "fullName": " Updated Person ",
          "professionalTitle": " Director ",
          "bio": " Storyteller ",
          "location": " Bucharest ",
          "websiteUrl": " https://example.com/me "
        }
        """);

    assertThat(
            jdbcTemplate.queryForObject(
                "SELECT full_name FROM users WHERE username = 'creativeuser'", String.class))
        .isEqualTo("Updated Person");
    var fields =
        jdbcTemplate.queryForMap(
            "SELECT professional_title, bio, location, website_url FROM profiles");
    assertThat(fields)
        .containsEntry("professional_title", "Director")
        .containsEntry("bio", "Storyteller")
        .containsEntry("location", "Bucharest")
        .containsEntry("website_url", "https://example.com/me");
  }

  @Test
  void patchPreservesOmittedValuesAndExplicitNullClearsField() throws Exception {
    patchProfile("{\"professionalTitle\":\"Director\",\"bio\":\"Original\"}");
    patchProfile("{\"bio\":null}")
        .andExpect(jsonPath("$.professionalTitle").value("Director"))
        .andExpect(jsonPath("$.bio").value(org.hamcrest.Matchers.nullValue()));
  }

  @Test
  void patchRejectsInvalidUrlAndUnknownFields() throws Exception {
    mockMvc
        .perform(
            patch("/api/v1/profiles/me")
                .header(HttpHeaders.AUTHORIZATION, bearer())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"websiteUrl\":\"ftp://example.com\"}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("INVALID_PROFILE_URL"));

    mockMvc
        .perform(
            patch("/api/v1/profiles/me")
                .header(HttpHeaders.AUTHORIZATION, bearer())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"new@example.com\"}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("MALFORMED_REQUEST"));
  }

  @Test
  void publicProfileIsPublicNormalizedAndContainsNoEmail() throws Exception {
    var response =
        mockMvc
            .perform(get("/api/v1/profiles/CREATIVEUSER"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.username").value("creativeuser"))
            .andExpect(jsonPath("$.email").doesNotExist())
            .andExpect(jsonPath("$.user.email").doesNotExist())
            .andReturn()
            .getResponse()
            .getContentAsString();
    assertThat(response).doesNotContain("user@example.com");
  }

  @Test
  void unknownUsernameReturnsStructuredNotFound() throws Exception {
    mockMvc
        .perform(get("/api/v1/profiles/unknown"))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("PROFILE_NOT_FOUND"));
  }

  @Test
  void flywayAppliedAllTenMigrations() {
    var versions =
        jdbcTemplate.queryForList(
            "SELECT version FROM flyway_schema_history WHERE success ORDER BY installed_rank",
            String.class);
    assertThat(versions)
        .containsExactly("1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12");
  }

  private org.springframework.test.web.servlet.ResultActions patchProfile(String body)
      throws Exception {
    return mockMvc
        .perform(
            patch("/api/v1/profiles/me")
                .header(HttpHeaders.AUTHORIZATION, bearer())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isOk());
  }

  private void register() throws Exception {
    mockMvc
        .perform(
            post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {
                      "email":"user@example.com",
                      "username":"creativeuser",
                      "password":"ExamplePassword123!",
                      "fullName":"Creative User"
                    }
                    """))
        .andExpect(status().isCreated());
  }

  private String login() throws Exception {
    var result =
        mockMvc
            .perform(
                post("/api/v1/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        objectMapper.writeValueAsString(
                            Map.of(
                                "identifier",
                                "user@example.com",
                                "password",
                                "ExamplePassword123!"))))
            .andExpect(status().isOk())
            .andReturn();
    JsonNode response = objectMapper.readTree(result.getResponse().getContentAsString());
    return response.path("accessToken").asText();
  }

  private String bearer() {
    return "Bearer " + accessToken;
  }
}

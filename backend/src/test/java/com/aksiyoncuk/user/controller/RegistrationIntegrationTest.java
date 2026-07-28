package com.aksiyoncuk.user.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.aksiyoncuk.profile.repository.ProfileRepository;
import com.aksiyoncuk.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
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
class RegistrationIntegrationTest {

  @Container
  static final PostgreSQLContainer<?> POSTGRES =
      new PostgreSQLContainer<>("postgres:17")
          .withDatabaseName("aksiyoncuk")
          .withUsername("aksiyoncuk")
          .withPassword("integration_test_only");

  @DynamicPropertySource
  static void databaseProperties(DynamicPropertyRegistry registry) {
    registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
    registry.add("spring.datasource.username", POSTGRES::getUsername);
    registry.add("spring.datasource.password", POSTGRES::getPassword);
    registry.add("spring.datasource.driver-class-name", POSTGRES::getDriverClassName);
    registry.add("app.jwt.access-secret", () -> "integration-test-secret-with-at-least-32-bytes");
  }

  @Autowired private MockMvc mockMvc;
  @Autowired private UserRepository userRepository;
  @Autowired private ProfileRepository profileRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @BeforeEach
  void cleanDatabase() {
    profileRepository.deleteAll();
    userRepository.deleteAll();
  }

  @Test
  void successfulRegistrationPersistsUserAndProfileWithBcryptPassword() throws Exception {
    var result =
        mockMvc
            .perform(
                post("/api/v1/auth/register")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(validRequest("User@Example.com", "CreativeUser")))
            .andExpect(status().isCreated())
            .andExpect(
                header()
                    .string(
                        "Location",
                        org.hamcrest.Matchers.matchesPattern("/api/v1/users/[0-9a-f-]+")))
            .andExpect(jsonPath("$.email").value("user@example.com"))
            .andExpect(jsonPath("$.username").value("creativeuser"))
            .andExpect(jsonPath("$.fullName").value("Creative User"))
            .andExpect(jsonPath("$.status").value("ACTIVE"))
            .andExpect(jsonPath("$.createdAt").exists())
            .andExpect(jsonPath("$.profile.professionalTitle").isEmpty())
            .andExpect(jsonPath("$.profile.bio").isEmpty())
            .andExpect(jsonPath("$.profile.location").isEmpty())
            .andExpect(jsonPath("$.profile.websiteUrl").isEmpty())
            .andExpect(jsonPath("$.password").doesNotExist())
            .andExpect(jsonPath("$.passwordHash").doesNotExist())
            .andReturn();

    assertThat(result.getResponse().getContentAsString()).doesNotContainIgnoringCase("password");
    var user = userRepository.findAll().getFirst();
    assertThat(user.getEmail()).isEqualTo("user@example.com");
    assertThat(user.getUsername()).isEqualTo("creativeuser");
    assertThat(user.getPasswordHash()).startsWith("$2");
    assertThat(passwordEncoder.matches("ExamplePassword123!", user.getPasswordHash())).isTrue();
    assertThat(profileRepository.existsByUserId(user.getId())).isTrue();
  }

  @Test
  void duplicateEmailReturnsConflict() throws Exception {
    register(validRequest("user@example.com", "firstuser"));

    mockMvc
        .perform(
            post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(validRequest(" USER@example.com ", "seconduser")))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("EMAIL_ALREADY_EXISTS"))
        .andExpect(jsonPath("$.status").value(409));
  }

  @Test
  void duplicateUsernameReturnsConflict() throws Exception {
    register(validRequest("first@example.com", "CreativeUser"));

    mockMvc
        .perform(
            post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(validRequest("second@example.com", " creativeuser ")))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("USERNAME_ALREADY_EXISTS"))
        .andExpect(jsonPath("$.status").value(409));
  }

  @Test
  void malformedEmailReturnsBadRequest() throws Exception {
    expectValidationError(validRequest("not-an-email", "creativeuser"), "email");
  }

  @Test
  void invalidUsernameReturnsBadRequest() throws Exception {
    expectValidationError(validRequest("user@example.com", "unsafe user!"), "username");
  }

  @Test
  void shortPasswordReturnsBadRequest() throws Exception {
    var request =
        """
        {
          "email": "user@example.com",
          "username": "creativeuser",
          "password": "short",
          "fullName": "Creative User"
        }
        """;
    expectValidationError(request, "password");
  }

  @Test
  void blankFullNameReturnsBadRequest() throws Exception {
    var request =
        """
        {
          "email": "user@example.com",
          "username": "creativeuser",
          "password": "ExamplePassword123!",
          "fullName": " "
        }
        """;
    expectValidationError(request, "fullName");
  }

  @Test
  void unknownRequestFieldReturnsBadRequest() throws Exception {
    var request =
        """
        {
          "email": "user@example.com",
          "username": "creativeuser",
          "password": "ExamplePassword123!",
          "fullName": "Creative User",
          "unexpected": true
        }
        """;
    mockMvc
        .perform(
            post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON).content(request))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("MALFORMED_REQUEST"));
  }

  private void register(String request) throws Exception {
    mockMvc
        .perform(
            post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON).content(request))
        .andExpect(status().isCreated());
  }

  private void expectValidationError(String request, String field) throws Exception {
    mockMvc
        .perform(
            post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON).content(request))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
        .andExpect(jsonPath("$.validationErrors[?(@.field == '" + field + "')]").exists());
  }

  private String validRequest(String email, String username) {
    return """
        {
          "email": "%s",
          "username": "%s",
          "password": "ExamplePassword123!",
          "fullName": "Creative User"
        }
        """
        .formatted(email, username);
  }
}

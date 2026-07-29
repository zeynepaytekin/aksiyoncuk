package com.aksiyoncuk.notification.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Collections;
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
import org.springframework.test.web.servlet.ResultActions;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("integration-test")
@Testcontainers
class NotificationIntegrationTest {
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
        "app.jwt.access-secret", () -> "notification-integration-secret-with-at-least-32-bytes");
  }

  @Autowired private MockMvc mvc;
  @Autowired private ObjectMapper json;
  @Autowired private JdbcTemplate jdbc;

  private String ownerToken;
  private String actorToken;
  private String otherToken;

  @BeforeEach
  void setUp() throws Exception {
    jdbc.execute("truncate table users cascade");
    ownerToken = registerAndLogin("notifyowner", "Notification Owner");
    actorToken = registerAndLogin("notifyactor", "Notification Actor");
    otherToken = registerAndLogin("notifyother", "Notification Other");
  }

  @Test
  void followLikeAndCommentCreateSafeDeduplicatedNotifications() throws Exception {
    mvc.perform(
            put("/api/v1/users/notifyowner/follow")
                .header(HttpHeaders.AUTHORIZATION, bearer(actorToken)))
        .andExpect(status().isOk());
    mvc.perform(
            put("/api/v1/users/notifyowner/follow")
                .header(HttpHeaders.AUTHORIZATION, bearer(actorToken)))
        .andExpect(status().isOk());
    var postId = createPost(ownerToken);
    mvc.perform(
            put("/api/v1/posts/{id}/like", postId)
                .header(HttpHeaders.AUTHORIZATION, bearer(actorToken)))
        .andExpect(status().isOk());
    mvc.perform(
            put("/api/v1/posts/{id}/like", postId)
                .header(HttpHeaders.AUTHORIZATION, bearer(actorToken)))
        .andExpect(status().isOk());
    mvc.perform(
            put("/api/v1/posts/{id}/like", postId)
                .header(HttpHeaders.AUTHORIZATION, bearer(ownerToken)))
        .andExpect(status().isOk());
    mvc.perform(
            post("/api/v1/posts/{id}/comments", postId)
                .header(HttpHeaders.AUTHORIZATION, bearer(actorToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("content", "Great project."))))
        .andExpect(status().isCreated());
    mvc.perform(
            post("/api/v1/posts/{id}/comments", postId)
                .header(HttpHeaders.AUTHORIZATION, bearer(ownerToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("content", "Owner comment."))))
        .andExpect(status().isCreated());

    assertThat(countNotifications("notifyowner")).isEqualTo(3);
    list(ownerToken, null)
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.totalElements").value(3))
        .andExpect(jsonPath("$.content[0].actor.email").doesNotExist())
        .andExpect(jsonPath("$.content[0].passwordHash").doesNotExist())
        .andExpect(jsonPath("$.content[0].read").value(false));
    list(ownerToken, "POST_LIKED")
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.totalElements").value(1));
    list(actorToken, null)
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.totalElements").value(0));
  }

  @Test
  void applicationEventsAndIdempotentReviewsNotifyCorrectRecipients() throws Exception {
    var jobId = createJob(ownerToken);
    var first = apply(actorToken, jobId);
    var second = apply(otherToken, jobId);

    assertThat(countNotifications("notifyowner")).isEqualTo(2);
    transition(ownerToken, first, "accept").andExpect(status().isOk());
    transition(ownerToken, first, "accept").andExpect(status().isOk());
    transition(ownerToken, second, "reject").andExpect(status().isOk());
    transition(ownerToken, second, "reject").andExpect(status().isOk());

    list(actorToken, null)
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.totalElements").value(1))
        .andExpect(jsonPath("$.content[0].type").value("JOB_APPLICATION_ACCEPTED"));
    list(otherToken, null)
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.totalElements").value(1))
        .andExpect(jsonPath("$.content[0].type").value("JOB_APPLICATION_REJECTED"));
    assertThat(
            jdbc.queryForObject(
                "select count(*) from notifications where notification_type like 'JOB_APPLICATION_%'",
                Long.class))
        .isEqualTo(4);
  }

  @Test
  void readUnreadBulkAccessNullableActorCascadeAndFlywayAreVerified() throws Exception {
    mvc.perform(
            put("/api/v1/users/notifyowner/follow")
                .header(HttpHeaders.AUTHORIZATION, bearer(actorToken)))
        .andExpect(status().isOk());
    var notificationId =
        jdbc.queryForObject(
            "select id from notifications where recipient_id = (select id from users where username = 'notifyowner')",
            UUID.class);

    mvc.perform(
            get("/api/v1/notifications/summary")
                .header(HttpHeaders.AUTHORIZATION, bearer(ownerToken)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.unreadCount").value(1));
    mutate(ownerToken, notificationId, "read")
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.read").value(true));
    mutate(ownerToken, notificationId, "read").andExpect(status().isOk());
    mutate(ownerToken, notificationId, "unread")
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.read").value(false));
    mutate(otherToken, notificationId, "read")
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("NOTIFICATION_ACCESS_FORBIDDEN"));
    mvc.perform(
            post("/api/v1/notifications/read-all")
                .header(HttpHeaders.AUTHORIZATION, bearer(ownerToken)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.unreadCount").value(0));

    jdbc.update("delete from users where username = 'notifyactor'");
    list(ownerToken, null)
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content[0].actor").doesNotExist());
    mvc.perform(
            get("/api/v1/notifications")
                .param("size", "51")
                .header(HttpHeaders.AUTHORIZATION, bearer(ownerToken)))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("INVALID_NOTIFICATION_PAGINATION"));
    mvc.perform(
            post("/api/v1/notifications/not-a-uuid/read")
                .header(HttpHeaders.AUTHORIZATION, bearer(ownerToken)))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("MALFORMED_REQUEST"));
    jdbc.update("delete from users where username = 'notifyowner'");
    assertThat(jdbc.queryForObject("select count(*) from notifications", Long.class)).isZero();
    assertThat(
            jdbc.queryForObject(
                "select version from flyway_schema_history where success order by installed_rank desc limit 1",
                String.class))
        .isEqualTo("14");
  }

  private ResultActions list(String token, String type) throws Exception {
    var request = get("/api/v1/notifications").header(HttpHeaders.AUTHORIZATION, bearer(token));
    if (type != null) request.param("type", type);
    return mvc.perform(request);
  }

  private ResultActions mutate(String token, UUID id, String action) throws Exception {
    return mvc.perform(
        post("/api/v1/notifications/{id}/{action}", id, action)
            .header(HttpHeaders.AUTHORIZATION, bearer(token)));
  }

  private UUID createPost(String token) throws Exception {
    var result =
        mvc.perform(
                post("/api/v1/posts")
                    .header(HttpHeaders.AUTHORIZATION, bearer(token))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(json.writeValueAsString(Map.of("content", "Notification post"))))
            .andExpect(status().isCreated())
            .andReturn();
    return UUID.fromString(
        json.readTree(result.getResponse().getContentAsString()).path("id").asText());
  }

  private UUID createJob(String token) throws Exception {
    var result =
        mvc.perform(
                post("/api/v1/jobs")
                    .header(HttpHeaders.AUTHORIZATION, bearer(token))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        json.writeValueAsString(
                            Map.of(
                                "title",
                                "Notification Job",
                                "description",
                                "Project description",
                                "category",
                                "PROFESSIONAL",
                                "workMode",
                                "REMOTE",
                                "compensationType",
                                "UNPAID"))))
            .andExpect(status().isCreated())
            .andReturn();
    return UUID.fromString(
        json.readTree(result.getResponse().getContentAsString()).path("id").asText());
  }

  private UUID apply(String token, UUID jobId) throws Exception {
    var result =
        mvc.perform(
                post("/api/v1/jobs/{id}/applications", jobId)
                    .header(HttpHeaders.AUTHORIZATION, bearer(token))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        json.writeValueAsString(
                            Collections.singletonMap("coverLetter", "I would like to apply."))))
            .andExpect(status().isCreated())
            .andReturn();
    return UUID.fromString(
        json.readTree(result.getResponse().getContentAsString()).path("id").asText());
  }

  private ResultActions transition(String token, UUID id, String transition) throws Exception {
    return mvc.perform(
        post("/api/v1/job-applications/{id}/{transition}", id, transition)
            .header(HttpHeaders.AUTHORIZATION, bearer(token)));
  }

  private long countNotifications(String username) {
    return jdbc.queryForObject(
        "select count(*) from notifications n join users u on u.id = n.recipient_id where u.username = ?",
        Long.class,
        username);
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
    return json.readTree(result.getResponse().getContentAsString()).path("accessToken").asText();
  }

  private String bearer(String token) {
    return "Bearer " + token;
  }
}

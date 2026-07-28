package com.aksiyoncuk.messaging.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

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
class MessagingIntegrationTest {
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
        "app.jwt.access-secret", () -> "messaging-integration-secret-with-at-least-32-bytes");
  }

  @Autowired private MockMvc mvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private JdbcTemplate jdbc;

  private String firstToken;
  private String secondToken;
  private String thirdToken;
  private UUID firstId;

  @BeforeEach
  void setup() throws Exception {
    jdbc.execute("truncate table conversations cascade");
    jdbc.execute("truncate table users cascade");
    register("first@example.com", "firstmsg", "First User");
    register("second@example.com", "secondmsg", "Second User");
    register("third@example.com", "thirdmsg", "Third User");
    firstToken = login("first@example.com");
    secondToken = login("second@example.com");
    thirdToken = login("third@example.com");
    firstId = id("firstmsg");
  }

  @Test
  void createsOnceReusesInReverseAndRequiresAuthentication() throws Exception {
    mvc.perform(
            post("/api/v1/conversations")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"secondmsg\"}"))
        .andExpect(status().isUnauthorized());

    var conversationId =
        start(firstToken, "secondmsg", 201)
            .andExpect(header().exists(HttpHeaders.LOCATION))
            .andReturn();
    var id =
        objectMapper.readTree(conversationId.getResponse().getContentAsString()).get("id").asText();
    start(firstToken, "secondmsg", 200).andExpect(jsonPath("$.id").value(id));
    start(secondToken, "firstmsg", 200).andExpect(jsonPath("$.id").value(id));
    assertThat(jdbc.queryForObject("select count(*) from conversations", Long.class)).isEqualTo(1);
    assertThat(jdbc.queryForObject("select count(*) from conversation_participants", Long.class))
        .isEqualTo(2);

    start(firstToken, "firstmsg", 400)
        .andExpect(jsonPath("$.code").value("SELF_CONVERSATION_NOT_ALLOWED"));
  }

  @Test
  void participantsSendListAndUnreadReadSummaryIsAccurate() throws Exception {
    var conversationId = conversationId(start(firstToken, "secondmsg", 201));
    send(firstToken, conversationId, "  First message  ", 201)
        .andExpect(jsonPath("$.content").value("First message"))
        .andExpect(jsonPath("$.sentByCurrentUser").value(true))
        .andExpect(jsonPath("$.sender.email").doesNotExist());
    send(secondToken, conversationId, "Second message", 201);
    send(firstToken, conversationId, "Newest message", 201);

    mvc.perform(
            get("/api/v1/conversations/{id}/messages", conversationId)
                .header(HttpHeaders.AUTHORIZATION, bearer(secondToken)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content[0].content").value("Newest message"))
        .andExpect(jsonPath("$.content[2].content").value("First message"))
        .andExpect(jsonPath("$.content[0].sender.passwordHash").doesNotExist());

    mvc.perform(
            get("/api/v1/conversations/{id}", conversationId)
                .header(HttpHeaders.AUTHORIZATION, bearer(secondToken)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.unreadCount").value(2))
        .andExpect(jsonPath("$.latestMessage.content").value("Newest message"));
    mvc.perform(
            get("/api/v1/messaging/summary").header(HttpHeaders.AUTHORIZATION, bearer(secondToken)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.unreadConversationCount").value(1))
        .andExpect(jsonPath("$.unreadMessageCount").value(2));

    mvc.perform(
            post("/api/v1/conversations/{id}/read", conversationId)
                .header(HttpHeaders.AUTHORIZATION, bearer(secondToken)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.unreadCount").value(0));
    mvc.perform(
            post("/api/v1/conversations/{id}/read", conversationId)
                .header(HttpHeaders.AUTHORIZATION, bearer(secondToken)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.unreadCount").value(0));
  }

  @Test
  void unrelatedUserCannotReadOrSendAndMissingPathsAreStructured() throws Exception {
    var conversationId = conversationId(start(firstToken, "secondmsg", 201));
    mvc.perform(
            get("/api/v1/conversations/{id}", conversationId)
                .header(HttpHeaders.AUTHORIZATION, bearer(thirdToken)))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("CONVERSATION_ACCESS_FORBIDDEN"));
    send(thirdToken, conversationId, "Forbidden", 403)
        .andExpect(jsonPath("$.code").value("CONVERSATION_ACCESS_FORBIDDEN"));
    mvc.perform(
            get("/api/v1/conversations/not-a-uuid")
                .header(HttpHeaders.AUTHORIZATION, bearer(firstToken)))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("MALFORMED_REQUEST"));
    mvc.perform(
            get("/api/v1/conversations/{id}", UUID.randomUUID())
                .header(HttpHeaders.AUTHORIZATION, bearer(firstToken)))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("CONVERSATION_NOT_FOUND"));
  }

  @Test
  void validatesMessageAndConversationPagination() throws Exception {
    var conversationId = conversationId(start(firstToken, "secondmsg", 201));
    send(firstToken, conversationId, "   ", 400)
        .andExpect(jsonPath("$.code").value("INVALID_MESSAGE_CONTENT"));
    send(firstToken, conversationId, "x".repeat(5001), 400)
        .andExpect(jsonPath("$.code").value("INVALID_MESSAGE_CONTENT"));
    mvc.perform(
            get("/api/v1/conversations")
                .param("size", "51")
                .header(HttpHeaders.AUTHORIZATION, bearer(firstToken)))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("INVALID_MESSAGING_PAGINATION"));
    mvc.perform(
            get("/api/v1/conversations/{id}/messages", conversationId)
                .param("size", "101")
                .header(HttpHeaders.AUTHORIZATION, bearer(firstToken)))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("INVALID_MESSAGING_PAGINATION"));
  }

  @Test
  void deletedSenderRemainsNullableAndParticipantRowsCascade() throws Exception {
    var conversationId = conversationId(start(firstToken, "secondmsg", 201));
    send(firstToken, conversationId, "Historical message", 201);
    jdbc.update("delete from users where id = ?", firstId);

    mvc.perform(
            get("/api/v1/conversations/{id}/messages", conversationId)
                .header(HttpHeaders.AUTHORIZATION, bearer(secondToken)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content[0].content").value("Historical message"))
        .andExpect(jsonPath("$.content[0].sender").doesNotExist())
        .andExpect(jsonPath("$.content[0].sentByCurrentUser").value(false));
    assertThat(
            jdbc.queryForObject(
                "select count(*) from conversation_participants where conversation_id = ?",
                Long.class,
                conversationId))
        .isEqualTo(1);
  }

  private org.springframework.test.web.servlet.ResultActions start(
      String token, String username, int status) throws Exception {
    return mvc.perform(
            post("/api/v1/conversations")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("username", username))))
        .andExpect(status().is(status));
  }

  private org.springframework.test.web.servlet.ResultActions send(
      String token, UUID conversationId, String content, int status) throws Exception {
    return mvc.perform(
            post("/api/v1/conversations/{id}/messages", conversationId)
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("content", content))))
        .andExpect(status().is(status));
  }

  private UUID conversationId(org.springframework.test.web.servlet.ResultActions action)
      throws Exception {
    return UUID.fromString(
        objectMapper
            .readTree(action.andReturn().getResponse().getContentAsString())
            .get("id")
            .asText());
  }

  private void register(String email, String username, String fullName) throws Exception {
    mvc.perform(
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

  private String login(String email) throws Exception {
    var response =
        mvc.perform(
                post("/api/v1/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        objectMapper.writeValueAsString(
                            Map.of("identifier", email, "password", "StrongPassword123!"))))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    return objectMapper.readTree(response).get("accessToken").asText();
  }

  private UUID id(String username) {
    return jdbc.queryForObject("select id from users where username = ?", UUID.class, username);
  }

  private String bearer(String token) {
    return "Bearer " + token;
  }
}

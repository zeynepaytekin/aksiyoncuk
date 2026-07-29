package com.aksiyoncuk.media.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.aksiyoncuk.media.storage.MediaStorage;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest(
    classes = {
      com.aksiyoncuk.AksiyoncukApplication.class,
      MediaIntegrationTest.StorageConfig.class
    })
@AutoConfigureMockMvc
@ActiveProfiles("integration-test")
@Testcontainers
class MediaIntegrationTest {
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
        "app.jwt.access-secret", () -> "media-integration-test-secret-with-at-least-32-bytes");
  }

  @Autowired MockMvc mockMvc;
  @Autowired ObjectMapper objectMapper;

  @Test
  void avatarRequiresAuthenticationValidatesContentAndAppearsOnProfile() throws Exception {
    register("mediaavatar");
    var token = login("mediaavatar");
    var image =
        new MockMultipartFile("file", "../avatar.jpg", "image/jpeg", new byte[] {-1, -40, -1, 1});

    mockMvc
        .perform(multipart("/api/v1/media/profile/avatar").file(image))
        .andExpect(status().isUnauthorized());

    mockMvc
        .perform(
            multipart("/api/v1/media/profile/avatar")
                .file(image)
                .header("Authorization", "Bearer " + token))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.url").value(org.hamcrest.Matchers.startsWith("http://media.test/")))
        .andExpect(jsonPath("$.storageKey").doesNotExist())
        .andExpect(jsonPath("$.sizeBytes").value(4));

    mockMvc
        .perform(get("/api/v1/profiles/me").header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(
            jsonPath("$.avatarUrl").value(org.hamcrest.Matchers.startsWith("http://media.test/")))
        .andExpect(jsonPath("$.coverUrl").isEmpty());

    var svg = new MockMultipartFile("file", "bad.svg", "image/svg+xml", "<svg/>".getBytes());
    mockMvc
        .perform(
            multipart("/api/v1/media/profile/avatar")
                .file(svg)
                .header("Authorization", "Bearer " + token))
        .andExpect(status().isUnsupportedMediaType())
        .andExpect(jsonPath("$.code").value("MEDIA_TYPE_NOT_ALLOWED"));

    mockMvc
        .perform(delete("/api/v1/media/profile/avatar").header("Authorization", "Bearer " + token))
        .andExpect(status().isNoContent());
  }

  @Test
  void ownersCanOrderAndDeleteParentMediaWhileLimitsAndOwnershipAreEnforced() throws Exception {
    register("mediaowner");
    register("mediaother");
    var ownerToken = login("mediaowner");
    var otherToken = login("mediaother");
    var image =
        new MockMultipartFile(
            "file", "image.png", "image/png", new byte[] {-119, 80, 78, 71, 13, 10, 26, 10});

    var postId = create("/api/v1/posts", ownerToken, Map.of("content", "Post with media"), "id");
    var postMediaIds = new ArrayList<String>();
    for (int i = 0; i < 4; i++) {
      postMediaIds.add(upload("/api/v1/posts/" + postId + "/media", ownerToken, image));
    }
    mockMvc
        .perform(
            multipart("/api/v1/posts/{postId}/media", postId)
                .file(image)
                .header("Authorization", "Bearer " + ownerToken))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("MEDIA_LIMIT_EXCEEDED"));
    mockMvc
        .perform(
            multipart("/api/v1/posts/{postId}/media", postId)
                .file(image)
                .header("Authorization", "Bearer " + otherToken))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("MEDIA_ACCESS_FORBIDDEN"));

    var reversed = new ArrayList<>(postMediaIds);
    java.util.Collections.reverse(reversed);
    mockMvc
        .perform(
            put("/api/v1/posts/{postId}/media/order", postId)
                .header("Authorization", "Bearer " + ownerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsBytes(Map.of("mediaIds", reversed))))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].id").value(reversed.getFirst()))
        .andExpect(jsonPath("$[0].displayOrder").value(0));
    mockMvc
        .perform(
            put("/api/v1/posts/{postId}/media/order", postId)
                .header("Authorization", "Bearer " + ownerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    objectMapper.writeValueAsBytes(
                        Map.of("mediaIds", List.of(reversed.getFirst(), reversed.getFirst())))))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("MEDIA_ORDER_INVALID"));

    var workId =
        create(
            "/api/v1/works",
            ownerToken,
            Map.of(
                "title", "Work with media",
                "description", "Test",
                "workType", "OTHER",
                "releaseYear", 2026),
            "id");
    String workMediaId = null;
    for (int i = 0; i < 12; i++) {
      workMediaId = upload("/api/v1/works/" + workId + "/media", ownerToken, image);
    }
    mockMvc
        .perform(
            multipart("/api/v1/works/{workId}/media", workId)
                .file(image)
                .header("Authorization", "Bearer " + ownerToken))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("MEDIA_LIMIT_EXCEEDED"));
    mockMvc
        .perform(
            delete("/api/v1/works/{workId}/media/{mediaId}", workId, workMediaId)
                .header("Authorization", "Bearer " + otherToken))
        .andExpect(status().isForbidden());
    mockMvc
        .perform(
            delete("/api/v1/works/{workId}/media/{mediaId}", workId, workMediaId)
                .header("Authorization", "Bearer " + ownerToken))
        .andExpect(status().isNoContent());
  }

  private void register(String username) throws Exception {
    mockMvc
        .perform(
            post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    objectMapper.writeValueAsBytes(
                        Map.of(
                            "email",
                            username + "@example.com",
                            "username",
                            username,
                            "password",
                            "ExamplePassword123!",
                            "fullName",
                            "Media User"))))
        .andExpect(status().isCreated());
  }

  private String login(String username) throws Exception {
    var body =
        mockMvc
            .perform(
                post("/api/v1/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        objectMapper.writeValueAsBytes(
                            Map.of(
                                "identifier",
                                username + "@example.com",
                                "password",
                                "ExamplePassword123!"))))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    return objectMapper.readTree(body).get("accessToken").asText();
  }

  private String create(String path, String token, Map<String, ?> request, String idField)
      throws Exception {
    var body =
        mockMvc
            .perform(
                post(path)
                    .header("Authorization", "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsBytes(request)))
            .andExpect(status().isCreated())
            .andReturn()
            .getResponse()
            .getContentAsString();
    return objectMapper.readTree(body).get(idField).asText();
  }

  private String upload(String path, String token, MockMultipartFile image) throws Exception {
    var body =
        mockMvc
            .perform(multipart(path).file(image).header("Authorization", "Bearer " + token))
            .andExpect(status().isCreated())
            .andReturn()
            .getResponse()
            .getContentAsString();
    return objectMapper.readTree(body).get("id").asText();
  }

  @TestConfiguration
  static class StorageConfig {
    @Bean
    @Primary
    MediaStorage mediaStorage() {
      return new MediaStorage() {
        private final Set<String> keys = ConcurrentHashMap.newKeySet();

        public void put(String key, byte[] content, String contentType, String filename) {
          keys.add(key);
        }

        public void delete(String key) {
          keys.remove(key);
        }

        public boolean exists(String key) {
          return keys.contains(key);
        }

        public URI resolvePublicUrl(String key) {
          return URI.create("http://media.test/" + key);
        }
      };
    }
  }
}

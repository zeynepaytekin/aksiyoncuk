package com.aksiyoncuk.freelance.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.aksiyoncuk.media.storage.MediaStorage;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest(
    classes = {
      com.aksiyoncuk.AksiyoncukApplication.class,
      FreelanceMarketplaceIntegrationTest.StorageConfig.class
    })
@AutoConfigureMockMvc
@ActiveProfiles("integration-test")
@Testcontainers
class FreelanceMarketplaceIntegrationTest {
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
        "app.jwt.access-secret", () -> "freelance-integration-secret-with-at-least-32-bytes");
  }

  @Autowired MockMvc mvc;
  @Autowired ObjectMapper mapper;
  @Autowired JdbcTemplate jdbc;
  String sellerToken;
  String buyerToken;
  String outsiderToken;
  UUID categoryId;

  @BeforeEach
  void setUp() throws Exception {
    jdbc.execute("TRUNCATE TABLE users CASCADE");
    register("seller");
    register("buyer");
    register("outsider");
    sellerToken = login("seller");
    buyerToken = login("buyer");
    outsiderToken = login("outsider");
    categoryId =
        jdbc.queryForObject(
            "SELECT id FROM freelance_categories WHERE active ORDER BY display_order,id LIMIT 1",
            UUID.class);
  }

  @Test
  void ownedSummaryAndWorkReferencesIncludeStatusAndPublicThumbnailsWithoutStorageData()
      throws Exception {
    var workId = createWork(sellerToken, "Thumbnail Work");
    upload("/api/v1/works/" + workId + "/media", sellerToken, "work.png");
    var service = createService(sellerToken, List.of(workId));
    var serviceId = UUID.fromString(service.path("id").asText());
    var firstMedia =
        upload("/api/v1/freelance/services/" + serviceId + "/media", sellerToken, "a.png");
    var secondMedia =
        upload("/api/v1/freelance/services/" + serviceId + "/media", sellerToken, "b.png");

    mvc.perform(
            put("/api/v1/freelance/services/{id}/media/order", serviceId)
                .header("Authorization", bearer(sellerToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    mapper.writeValueAsBytes(Map.of("mediaIds", List.of(secondMedia, firstMedia)))))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].id").value(secondMedia));
    mvc.perform(
            delete("/api/v1/freelance/services/{id}/media/{mediaId}", serviceId, firstMedia)
                .header("Authorization", bearer(outsiderToken)))
        .andExpect(status().isForbidden());

    mvc.perform(get("/api/v1/freelance/services/mine").header("Authorization", bearer(sellerToken)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content[0].id").value(serviceId.toString()))
        .andExpect(jsonPath("$.content[0].status").value("DRAFT"))
        .andExpect(jsonPath("$.content[0].updatedAt").isNotEmpty())
        .andExpect(
            jsonPath("$.content[0].thumbnailUrl")
                .value("http://media.test/" + storageKey(secondMedia)))
        .andExpect(jsonPath("$.content[0].seller").doesNotExist())
        .andExpect(
            content()
                .string(
                    org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("storageKey"))));

    mvc.perform(
            get("/api/v1/freelance/services/{id}", serviceId)
                .header("Authorization", bearer(sellerToken)))
        .andExpect(status().isOk())
        .andExpect(
            jsonPath(
                "$.works[0].thumbnailUrl", org.hamcrest.Matchers.startsWith("http://media.test/")))
        .andExpect(
            content()
                .string(
                    org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("storageKey"))));
  }

  @Test
  void listingLifecycleVisibilityOwnershipSearchSortsAndValidationAreEnforced() throws Exception {
    var duplicatePackages = new ArrayList<>(packages());
    duplicatePackages.add(new LinkedHashMap<>(packages().getFirst()));
    mvc.perform(
            post("/api/v1/freelance/services")
                .header("Authorization", bearer(sellerToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsBytes(serviceRequest(List.of(), duplicatePackages))))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("FREELANCE_PACKAGE_INVALID"));

    var service = createService(sellerToken, List.of());
    var id = service.path("id").asText();
    mvc.perform(get("/api/v1/freelance/services/{id}", id)).andExpect(status().isNotFound());
    mvc.perform(
            put("/api/v1/freelance/services/{id}", id)
                .header("Authorization", bearer(buyerToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsBytes(serviceRequest(List.of(), packages()))))
        .andExpect(status().isForbidden());

    transition(id, "publish", sellerToken)
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("PUBLISHED"));
    for (var query :
        List.of(
            "q=Professional",
            "category=grafik-ve-tasarim",
            "seller=seller",
            "minPrice=100&maxPrice=200",
            "deliveryDaysMax=3",
            "packageTier=BASIC",
            "sort=NEWEST",
            "sort=PRICE_ASC",
            "sort=PRICE_DESC",
            "sort=RATING_DESC",
            "sort=DELIVERY_ASC",
            "sort=POPULAR")) {
      mvc.perform(get("/api/v1/freelance/services?" + query))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.content[0].id").value(id));
    }
    mvc.perform(get("/api/v1/freelance/services?page=-1"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("FREELANCE_INVALID_PAGINATION"));
    transition(id, "pause", sellerToken).andExpect(jsonPath("$.status").value("PAUSED"));
    mvc.perform(get("/api/v1/freelance/services/{id}", id)).andExpect(status().isNotFound());
    transition(id, "publish", sellerToken).andExpect(jsonPath("$.status").value("PUBLISHED"));
    transition(id, "archive", sellerToken).andExpect(jsonPath("$.status").value("ARCHIVED"));
    transition(id, "publish", sellerToken)
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("FREELANCE_SERVICE_NOT_EDITABLE"));
  }

  @Test
  void fullOrderRevisionReviewSecurityMessagingAndNotificationsFlow() throws Exception {
    var service = publishedService();
    var serviceId = service.path("id").asText();
    var packageId = service.path("packages").get(0).path("id").asText();

    var conversation =
        postJson("/api/v1/freelance/services/" + serviceId + "/conversation", buyerToken, Map.of());
    assertThat(conversation.path("latestMessage").isNull()).isTrue();
    var reused =
        postJson("/api/v1/freelance/services/" + serviceId + "/conversation", buyerToken, Map.of());
    assertThat(reused.path("id").asText()).isEqualTo(conversation.path("id").asText());

    var order = createOrder(serviceId, packageId, "A stable immutable package snapshot");
    var orderId = order.path("id").asText();
    jdbc.update(
        "UPDATE freelance_service_packages SET price_amount=9999.00 WHERE id=?",
        UUID.fromString(packageId));
    mvc.perform(
            get("/api/v1/freelance/orders/{id}", orderId)
                .header("Authorization", bearer(buyerToken)))
        .andExpect(jsonPath("$.priceAmount").value(150.00));
    mvc.perform(
            get("/api/v1/freelance/orders/{id}", orderId)
                .header("Authorization", bearer(outsiderToken)))
        .andExpect(status().isForbidden());
    mvc.perform(
            post("/api/v1/freelance/orders/{id}/start", orderId)
                .header("Authorization", bearer(buyerToken)))
        .andExpect(status().isForbidden());

    order = action(orderId, "start", sellerToken, null);
    assertThat(order.path("deliveryDueAt").isTextual()).isTrue();
    var requestPart =
        new MockMultipartFile(
            "request",
            "",
            MediaType.APPLICATION_JSON_VALUE,
            mapper.writeValueAsBytes(Map.of("message", "Initial delivery message")));
    var textPart =
        new MockMultipartFile(
            "files",
            "delivery.txt",
            MediaType.TEXT_PLAIN_VALUE,
            "private delivery".getBytes(java.nio.charset.StandardCharsets.UTF_8));
    var deliveryResult =
        mvc.perform(
                multipart("/api/v1/freelance/orders/{id}/deliver", orderId)
                    .file(requestPart)
                    .file(textPart)
                    .header("Authorization", bearer(sellerToken)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.deliveries[0].attachments[0].filename").value("delivery.txt"))
            .andExpect(jsonPath("$.deliveries[0].attachments[0].storageKey").doesNotExist())
            .andExpect(jsonPath("$.deliveries[0].attachments[0].publicUrl").doesNotExist())
            .andReturn();
    order = mapper.readTree(deliveryResult.getResponse().getContentAsString());
    var deliveryId = order.path("deliveries").get(0).path("id").asText();
    var attachmentId =
        order.path("deliveries").get(0).path("attachments").get(0).path("id").asText();
    var downloadPath =
        "/api/v1/freelance/orders/"
            + orderId
            + "/deliveries/"
            + deliveryId
            + "/attachments/"
            + attachmentId
            + "/download";
    mvc.perform(get(downloadPath).header("Authorization", bearer(buyerToken)))
        .andExpect(status().isOk())
        .andExpect(
            content().bytes("private delivery".getBytes(java.nio.charset.StandardCharsets.UTF_8)));
    mvc.perform(get(downloadPath).header("Authorization", bearer(outsiderToken)))
        .andExpect(status().isForbidden());
    order =
        action(orderId, "revisions", buyerToken, Map.of("reason", "Please revise this delivery"));
    var revisionId = order.path("revisions").get(0).path("id").asText();
    action(orderId, "revisions/" + revisionId + "/acknowledge", sellerToken, null);
    action(orderId, "deliver", sellerToken, Map.of("message", "Revised delivery message"));
    order = action(orderId, "complete", buyerToken, null);
    assertThat(order.path("status").asText()).isEqualTo("COMPLETED");
    postJson(
        "/api/v1/freelance/orders/" + orderId + "/review",
        buyerToken,
        Map.of("rating", 5, "comment", "Excellent stabilization result"));
    mvc.perform(
            post("/api/v1/freelance/orders/{id}/review", orderId)
                .header("Authorization", bearer(buyerToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"rating\":5}"))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("FREELANCE_REVIEW_ALREADY_EXISTS"));
    mvc.perform(get("/api/v1/notifications").header("Authorization", bearer(sellerToken)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content[*].entityId", org.hamcrest.Matchers.hasItem(orderId)))
        .andExpect(
            jsonPath(
                "$.content[*].type",
                org.hamcrest.Matchers.hasItems(
                    "FREELANCE_ORDER_CREATED",
                    "FREELANCE_REVISION_REQUESTED",
                    "FREELANCE_REVIEW_RECEIVED")));
  }

  @Test
  void cancellationHistoryIsDeterministicAndRestoresPreviousState() throws Exception {
    var service = publishedService();
    var serviceId = service.path("id").asText();
    var packageId = service.path("packages").get(0).path("id").asText();
    var order = createOrder(serviceId, packageId, "Cancellation history verification");
    var orderId = order.path("id").asText();

    order =
        action(
            orderId,
            "cancellation-requests",
            buyerToken,
            Map.of("reason", "First rejected cancellation"));
    action(
        orderId,
        "cancellation-requests/"
            + order.path("pendingCancellation").path("id").asText()
            + "/reject",
        sellerToken,
        null);
    order =
        action(
            orderId,
            "cancellation-requests",
            buyerToken,
            Map.of("reason", "Second withdrawn cancellation"));
    order =
        action(
            orderId,
            "cancellation-requests/"
                + order.path("pendingCancellation").path("id").asText()
                + "/withdraw",
            buyerToken,
            null);
    assertThat(order.path("status").asText()).isEqualTo("CREATED");
    assertThat(order.path("cancellationHistory").size()).isEqualTo(2);
    assertThat(order.path("cancellationHistory").get(0).path("status").asText())
        .isEqualTo("REJECTED");
    assertThat(order.path("cancellationHistory").get(0).path("resolverRole").asText())
        .isEqualTo("SELLER");
    assertThat(order.path("cancellationHistory").get(1).path("status").asText())
        .isEqualTo("WITHDRAWN");
    assertThat(order.path("cancellationHistory").get(1).path("resolverRole").asText())
        .isEqualTo("BUYER");

    var accepted = createOrder(serviceId, packageId, "Accepted cancellation verification");
    accepted =
        action(
            accepted.path("id").asText(),
            "cancellation-requests",
            sellerToken,
            Map.of("reason", "Seller requests cancellation"));
    accepted =
        action(
            accepted.path("id").asText(),
            "cancellation-requests/"
                + accepted.path("pendingCancellation").path("id").asText()
                + "/accept",
            buyerToken,
            null);
    assertThat(accepted.path("status").asText()).isEqualTo("CANCELLED");
    assertThat(accepted.path("cancellationHistory").get(0).path("status").asText())
        .isEqualTo("ACCEPTED");
  }

  private JsonNode publishedService() throws Exception {
    var service = createService(sellerToken, List.of());
    return read(transition(service.path("id").asText(), "publish", sellerToken));
  }

  private JsonNode createService(String token, List<UUID> workIds) throws Exception {
    return postJson("/api/v1/freelance/services", token, serviceRequest(workIds, packages()));
  }

  private Map<String, Object> serviceRequest(
      List<UUID> workIds, List<? extends Map<String, Object>> servicePackages) {
    var request = new LinkedHashMap<String, Object>();
    request.put("categoryId", categoryId);
    request.put("title", "Professional Creative Stabilization");
    request.put("shortDescription", "A complete stabilization marketplace listing");
    request.put(
        "description",
        "A detailed stabilization listing description containing enough useful information.");
    request.put("languageCode", "en");
    request.put("packages", servicePackages);
    request.put("workIds", workIds);
    return request;
  }

  private List<LinkedHashMap<String, Object>> packages() {
    var basic = new LinkedHashMap<String, Object>();
    basic.put("tier", "BASIC");
    basic.put("name", "Basic");
    basic.put("description", "Complete basic package");
    basic.put("priceAmount", "150.00");
    basic.put("currencyCode", "TRY");
    basic.put("deliveryDays", 3);
    basic.put("revisionCount", 1);
    basic.put("active", true);
    return new ArrayList<>(List.of(basic));
  }

  private JsonNode createOrder(String serviceId, String packageId, String requirements)
      throws Exception {
    return postJson(
        "/api/v1/freelance/orders",
        buyerToken,
        Map.of("serviceId", serviceId, "packageId", packageId, "requirements", requirements));
  }

  private JsonNode action(String orderId, String action, String token, Map<String, ?> body)
      throws Exception {
    return postJson(
        "/api/v1/freelance/orders/" + orderId + "/" + action,
        token,
        body == null ? Map.of() : body);
  }

  private ResultActions transition(String serviceId, String action, String token) throws Exception {
    return mvc.perform(
        post("/api/v1/freelance/services/{id}/{action}", serviceId, action)
            .header("Authorization", bearer(token)));
  }

  private UUID createWork(String token, String title) throws Exception {
    return UUID.fromString(
        postJson(
                "/api/v1/works",
                token,
                Map.of(
                    "title",
                    title,
                    "description",
                    "Public thumbnail work",
                    "workType",
                    "OTHER",
                    "releaseYear",
                    2026))
            .path("id")
            .asText());
  }

  private String upload(String path, String token, String name) throws Exception {
    var file =
        new MockMultipartFile(
            "file", name, "image/png", new byte[] {-119, 80, 78, 71, 13, 10, 26, 10});
    var response =
        mvc.perform(multipart(path).file(file).header("Authorization", bearer(token)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.storageKey").doesNotExist())
            .andReturn();
    return mapper.readTree(response.getResponse().getContentAsString()).path("id").asText();
  }

  private String storageKey(String mediaId) {
    return jdbc.queryForObject(
        "SELECT storage_key FROM media_assets WHERE id=?", String.class, UUID.fromString(mediaId));
  }

  private JsonNode postJson(String path, String token, Map<String, ?> body) throws Exception {
    var request =
        post(path)
            .header("Authorization", bearer(token))
            .contentType(MediaType.APPLICATION_JSON)
            .content(mapper.writeValueAsBytes(body));
    return read(mvc.perform(request).andExpect(status().is2xxSuccessful()));
  }

  private JsonNode read(ResultActions result) throws Exception {
    return mapper.readTree(result.andReturn().getResponse().getContentAsString());
  }

  private void register(String username) throws Exception {
    mvc.perform(
            post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    mapper.writeValueAsBytes(
                        Map.of(
                            "email",
                            username + "@example.com",
                            "username",
                            username,
                            "password",
                            "ExamplePassword123!",
                            "fullName",
                            username + " User"))))
        .andExpect(status().isCreated());
  }

  private String login(String username) throws Exception {
    var response =
        mvc.perform(
                post("/api/v1/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        mapper.writeValueAsBytes(
                            Map.of("identifier", username, "password", "ExamplePassword123!"))))
            .andExpect(status().isOk())
            .andReturn();
    return mapper
        .readTree(response.getResponse().getContentAsString())
        .path("accessToken")
        .asText();
  }

  private String bearer(String token) {
    return "Bearer " + token;
  }

  @TestConfiguration
  static class StorageConfig {
    @Bean
    @Primary
    MediaStorage mediaStorage() {
      return new MediaStorage() {
        private final Set<String> keys = ConcurrentHashMap.newKeySet();
        private final Map<String, byte[]> privateObjects = new ConcurrentHashMap<>();

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

        public void putPrivate(String key, byte[] content, String contentType, String filename) {
          privateObjects.put(key, content);
        }

        public byte[] getPrivate(String key) {
          return privateObjects.get(key);
        }

        public void deletePrivate(String key) {
          privateObjects.remove(key);
        }
      };
    }
  }
}

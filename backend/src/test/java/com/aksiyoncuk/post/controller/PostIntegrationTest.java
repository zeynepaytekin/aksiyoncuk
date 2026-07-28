package com.aksiyoncuk.post.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.aksiyoncuk.auth.repository.RefreshTokenRepository;
import com.aksiyoncuk.post.comment.repository.PostCommentRepository;
import com.aksiyoncuk.post.like.repository.PostLikeRepository;
import com.aksiyoncuk.post.repository.PostRepository;
import com.aksiyoncuk.profile.repository.ProfileRepository;
import com.aksiyoncuk.user.repository.UserRepository;
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
class PostIntegrationTest {

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
        "app.jwt.access-secret", () -> "post-integration-test-secret-with-at-least-32-bytes");
  }

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private PostRepository postRepository;
  @Autowired private PostCommentRepository commentRepository;
  @Autowired private PostLikeRepository likeRepository;
  @Autowired private RefreshTokenRepository refreshTokenRepository;
  @Autowired private ProfileRepository profileRepository;
  @Autowired private UserRepository userRepository;
  @Autowired private JdbcTemplate jdbcTemplate;

  private String firstToken;
  private String secondToken;

  @BeforeEach
  void setUp() throws Exception {
    likeRepository.deleteAll();
    commentRepository.deleteAll();
    postRepository.deleteAll();
    refreshTokenRepository.deleteAll();
    profileRepository.deleteAll();
    userRepository.deleteAll();
    register("first@example.com", "firstuser", "First User");
    register("second@example.com", "seconduser", "Second User");
    firstToken = login("first@example.com");
    secondToken = login("second@example.com");
  }

  @Test
  void createReturnsCreatedSafeResponseAndRequiresAuthentication() throws Exception {
    mockMvc
        .perform(
            post("/api/v1/posts")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"content\":\"No token\"}"))
        .andExpect(status().isUnauthorized());

    var result =
        create(firstToken, "  My first post  ")
            .andExpect(status().isCreated())
            .andExpect(
                header()
                    .string(
                        HttpHeaders.LOCATION,
                        org.hamcrest.Matchers.containsString("/api/v1/posts/")))
            .andExpect(jsonPath("$.content").value("My first post"))
            .andExpect(jsonPath("$.ownedByCurrentUser").value(true))
            .andExpect(jsonPath("$.commentCount").value(0))
            .andExpect(jsonPath("$.author.username").value("firstuser"))
            .andReturn();
    var body = result.getResponse().getContentAsString();
    assertThat(body).doesNotContainIgnoringCase("email").doesNotContainIgnoringCase("password");
  }

  @Test
  void globalFeedIsPublicNewestFirstAndAnonymousOwnershipIsFalse() throws Exception {
    create(firstToken, "Older").andExpect(status().isCreated());
    create(secondToken, "Newer").andExpect(status().isCreated());

    mockMvc
        .perform(get("/api/v1/posts"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content[0].content").value("Newer"))
        .andExpect(jsonPath("$.content[1].content").value("Older"))
        .andExpect(jsonPath("$.content[0].ownedByCurrentUser").value(false))
        .andExpect(jsonPath("$.page").value(0))
        .andExpect(jsonPath("$.size").value(20));
  }

  @Test
  void currentUserFeedContainsOnlyOwnedPosts() throws Exception {
    create(firstToken, "First owner's post");
    create(secondToken, "Second owner's post");
    mockMvc
        .perform(get("/api/v1/posts/me").header(HttpHeaders.AUTHORIZATION, bearer(firstToken)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.totalElements").value(1))
        .andExpect(jsonPath("$.content[0].content").value("First owner's post"))
        .andExpect(jsonPath("$.content[0].ownedByCurrentUser").value(true));
  }

  @Test
  void singlePostIsPublic() throws Exception {
    var id =
        createdId(create(firstToken, "Public post").andReturn().getResponse().getContentAsString());
    mockMvc
        .perform(get("/api/v1/posts/{id}", id))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content").value("Public post"))
        .andExpect(jsonPath("$.ownedByCurrentUser").value(false));
  }

  @Test
  void onlyOwnerCanDelete() throws Exception {
    var forbiddenId =
        createdId(create(firstToken, "Keep").andReturn().getResponse().getContentAsString());
    mockMvc
        .perform(
            delete("/api/v1/posts/{id}", forbiddenId)
                .header(HttpHeaders.AUTHORIZATION, bearer(secondToken)))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("POST_DELETE_FORBIDDEN"));

    var deletedId =
        createdId(create(firstToken, "Delete").andReturn().getResponse().getContentAsString());
    mockMvc
        .perform(
            delete("/api/v1/posts/{id}", deletedId)
                .header(HttpHeaders.AUTHORIZATION, bearer(firstToken)))
        .andExpect(status().isNoContent());
    assertThat(postRepository.existsById(deletedId)).isFalse();
  }

  @Test
  void missingMalformedAndInvalidPaginationReturnStructuredErrors() throws Exception {
    mockMvc
        .perform(get("/api/v1/posts/{id}", UUID.randomUUID()))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("POST_NOT_FOUND"));
    mockMvc
        .perform(get("/api/v1/posts/not-a-uuid"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("MALFORMED_REQUEST"));
    mockMvc
        .perform(get("/api/v1/posts?page=-1"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("INVALID_PAGINATION"));
    mockMvc
        .perform(get("/api/v1/posts?size=51"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("INVALID_PAGINATION"));
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

  @Test
  void authenticatedCreationAndPublicOldestFirstListingAreSafe() throws Exception {
    var postId =
        createdId(create(firstToken, "Discuss").andReturn().getResponse().getContentAsString());

    mockMvc
        .perform(
            post("/api/v1/posts/{postId}/comments", postId)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"content\":\"No token\"}"))
        .andExpect(status().isUnauthorized());

    var first =
        createComment(firstToken, postId, "  First comment  ")
            .andExpect(status().isCreated())
            .andExpect(
                header()
                    .string(
                        HttpHeaders.LOCATION,
                        org.hamcrest.Matchers.containsString("/api/v1/comments/")))
            .andExpect(jsonPath("$.content").value("First comment"))
            .andExpect(jsonPath("$.ownedByCurrentUser").value(true))
            .andReturn()
            .getResponse()
            .getContentAsString();
    createComment(secondToken, postId, "Second comment").andExpect(status().isCreated());

    var body =
        mockMvc
            .perform(get("/api/v1/posts/{postId}/comments", postId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content[0].content").value("First comment"))
            .andExpect(jsonPath("$.content[1].content").value("Second comment"))
            .andExpect(jsonPath("$.content[0].ownedByCurrentUser").value(false))
            .andExpect(jsonPath("$.totalElements").value(2))
            .andReturn()
            .getResponse()
            .getContentAsString();
    assertThat(first).doesNotContainIgnoringCase("email").doesNotContainIgnoringCase("password");
    assertThat(body).doesNotContainIgnoringCase("email").doesNotContainIgnoringCase("password");

    mockMvc
        .perform(
            get("/api/v1/posts/{postId}/comments", postId)
                .header(HttpHeaders.AUTHORIZATION, bearer(firstToken)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content[0].ownedByCurrentUser").value(true))
        .andExpect(jsonPath("$.content[1].ownedByCurrentUser").value(false));
  }

  @Test
  void commentDeletionEnforcesOwnershipAndUpdatesPostCount() throws Exception {
    var postId =
        createdId(
            create(firstToken, "Count comments").andReturn().getResponse().getContentAsString());
    var commentId =
        createdId(
            createComment(firstToken, postId, "Delete me")
                .andReturn()
                .getResponse()
                .getContentAsString());

    mockMvc
        .perform(get("/api/v1/posts/{postId}", postId))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.commentCount").value(1));
    mockMvc
        .perform(
            delete("/api/v1/comments/{commentId}", commentId)
                .header(HttpHeaders.AUTHORIZATION, bearer(secondToken)))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("COMMENT_DELETE_FORBIDDEN"));
    mockMvc
        .perform(
            delete("/api/v1/comments/{commentId}", commentId)
                .header(HttpHeaders.AUTHORIZATION, bearer(firstToken)))
        .andExpect(status().isNoContent());
    mockMvc
        .perform(get("/api/v1/posts/{postId}", postId))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.commentCount").value(0));
  }

  @Test
  void commentMissingPostMalformedAndPaginationErrorsAreStructured() throws Exception {
    mockMvc
        .perform(
            post("/api/v1/posts/{postId}/comments", UUID.randomUUID())
                .header(HttpHeaders.AUTHORIZATION, bearer(firstToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"content\":\"Missing parent\"}"))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("POST_NOT_FOUND"));
    mockMvc
        .perform(get("/api/v1/posts/not-a-uuid/comments"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("MALFORMED_REQUEST"));
    mockMvc
        .perform(get("/api/v1/posts/{postId}/comments?page=-1", UUID.randomUUID()))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("INVALID_PAGINATION"));
    mockMvc
        .perform(
            delete("/api/v1/comments/{commentId}", UUID.randomUUID())
                .header(HttpHeaders.AUTHORIZATION, bearer(firstToken)))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("COMMENT_NOT_FOUND"));
  }

  @Test
  void deletingPostCascadesComments() throws Exception {
    var postId =
        createdId(create(firstToken, "Cascade").andReturn().getResponse().getContentAsString());
    createComment(secondToken, postId, "Remaining comment").andExpect(status().isCreated());
    assertThat(commentRepository.countByPostId(postId)).isEqualTo(1);

    mockMvc
        .perform(
            delete("/api/v1/posts/{postId}", postId)
                .header(HttpHeaders.AUTHORIZATION, bearer(firstToken)))
        .andExpect(status().isNoContent());

    assertThat(commentRepository.countByPostId(postId)).isZero();
  }

  @Test
  void likeIsAuthenticatedIdempotentAndVisibleOnlyToLiker() throws Exception {
    var postId =
        createdId(create(firstToken, "Like me").andReturn().getResponse().getContentAsString());

    mockMvc
        .perform(put("/api/v1/posts/{postId}/like", postId))
        .andExpect(status().isUnauthorized());

    var response =
        mockMvc
            .perform(
                put("/api/v1/posts/{postId}/like", postId)
                    .header(HttpHeaders.AUTHORIZATION, bearer(firstToken)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.likedByCurrentUser").value(true))
            .andExpect(jsonPath("$.likeCount").value(1))
            .andReturn()
            .getResponse()
            .getContentAsString();
    mockMvc
        .perform(
            put("/api/v1/posts/{postId}/like", postId)
                .header(HttpHeaders.AUTHORIZATION, bearer(firstToken)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.likeCount").value(1));

    assertThat(likeRepository.countByPostId(postId)).isEqualTo(1);
    assertThat(response).doesNotContainIgnoringCase("email").doesNotContainIgnoringCase("password");

    mockMvc
        .perform(get("/api/v1/posts/{postId}", postId))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.likeCount").value(1))
        .andExpect(jsonPath("$.likedByCurrentUser").value(false));
    mockMvc
        .perform(
            get("/api/v1/posts/{postId}", postId)
                .header(HttpHeaders.AUTHORIZATION, bearer(firstToken)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.likedByCurrentUser").value(true));
    mockMvc
        .perform(
            get("/api/v1/posts/{postId}", postId)
                .header(HttpHeaders.AUTHORIZATION, bearer(secondToken)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.likedByCurrentUser").value(false));
  }

  @Test
  void unlikeIsIdempotentAndDecreasesCount() throws Exception {
    var postId =
        createdId(create(firstToken, "Unlike me").andReturn().getResponse().getContentAsString());
    mockMvc
        .perform(
            put("/api/v1/posts/{postId}/like", postId)
                .header(HttpHeaders.AUTHORIZATION, bearer(firstToken)))
        .andExpect(status().isOk());

    mockMvc
        .perform(
            delete("/api/v1/posts/{postId}/like", postId)
                .header(HttpHeaders.AUTHORIZATION, bearer(firstToken)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.likedByCurrentUser").value(false))
        .andExpect(jsonPath("$.likeCount").value(0));
    mockMvc
        .perform(
            delete("/api/v1/posts/{postId}/like", postId)
                .header(HttpHeaders.AUTHORIZATION, bearer(firstToken)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.likeCount").value(0));
  }

  @Test
  void likeMissingMalformedAndCascadesAreCorrect() throws Exception {
    mockMvc
        .perform(
            put("/api/v1/posts/{postId}/like", UUID.randomUUID())
                .header(HttpHeaders.AUTHORIZATION, bearer(firstToken)))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("POST_NOT_FOUND"));
    mockMvc
        .perform(
            put("/api/v1/posts/not-a-uuid/like")
                .header(HttpHeaders.AUTHORIZATION, bearer(firstToken)))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("MALFORMED_REQUEST"));

    var postId =
        createdId(
            create(firstToken, "Cascade likes").andReturn().getResponse().getContentAsString());
    mockMvc
        .perform(
            put("/api/v1/posts/{postId}/like", postId)
                .header(HttpHeaders.AUTHORIZATION, bearer(secondToken)))
        .andExpect(status().isOk());
    assertThat(likeRepository.countByPostId(postId)).isOne();
    postRepository.deleteById(postId);
    postRepository.flush();
    assertThat(likeRepository.countByPostId(postId)).isZero();

    var secondPostId =
        createdId(
            create(firstToken, "User cascade").andReturn().getResponse().getContentAsString());
    mockMvc
        .perform(
            put("/api/v1/posts/{postId}/like", secondPostId)
                .header(HttpHeaders.AUTHORIZATION, bearer(secondToken)))
        .andExpect(status().isOk());
    var secondUser =
        userRepository
            .findByEmailOrUsername("second@example.com", "second@example.com")
            .orElseThrow();
    userRepository.delete(secondUser);
    userRepository.flush();
    assertThat(likeRepository.countByPostId(secondPostId)).isZero();
  }

  private org.springframework.test.web.servlet.ResultActions create(String token, String content)
      throws Exception {
    return mockMvc.perform(
        post("/api/v1/posts")
            .header(HttpHeaders.AUTHORIZATION, bearer(token))
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of("content", content))));
  }

  private org.springframework.test.web.servlet.ResultActions createComment(
      String token, UUID postId, String content) throws Exception {
    return mockMvc.perform(
        post("/api/v1/posts/{postId}/comments", postId)
            .header(HttpHeaders.AUTHORIZATION, bearer(token))
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of("content", content))));
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

  private UUID createdId(String json) throws Exception {
    return UUID.fromString(objectMapper.readTree(json).path("id").asText());
  }

  private String bearer(String token) {
    return "Bearer " + token;
  }
}

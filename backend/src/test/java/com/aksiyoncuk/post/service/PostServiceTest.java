package com.aksiyoncuk.post.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.aksiyoncuk.auth.security.AuthenticatedUser;
import com.aksiyoncuk.post.dto.CreatePostRequest;
import com.aksiyoncuk.post.entity.Post;
import com.aksiyoncuk.post.exception.InvalidPaginationException;
import com.aksiyoncuk.post.exception.InvalidPostContentException;
import com.aksiyoncuk.post.exception.PostDeleteForbiddenException;
import com.aksiyoncuk.post.exception.PostNotFoundException;
import com.aksiyoncuk.post.repository.PostRepository;
import com.aksiyoncuk.post.repository.PostRow;
import com.aksiyoncuk.profile.entity.Profile;
import com.aksiyoncuk.profile.repository.ProfileRepository;
import com.aksiyoncuk.user.entity.User;
import com.aksiyoncuk.user.repository.UserRepository;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;

@ExtendWith(MockitoExtension.class)
class PostServiceTest {

  @Mock private PostRepository postRepository;
  @Mock private UserRepository userRepository;
  @Mock private ProfileRepository profileRepository;
  @Mock private User user;
  @Mock private Profile profile;
  @Mock private Post post;

  private PostService service;
  private UUID userId;

  @BeforeEach
  void setUp() {
    service = new PostService(postRepository, userRepository, profileRepository);
    userId = UUID.randomUUID();
  }

  @Test
  void trimsContent() {
    assertThat(service.normalizeContent("  My post  ")).isEqualTo("My post");
  }

  @Test
  void rejectsBlankContent() {
    assertThatThrownBy(() -> service.normalizeContent("   "))
        .isInstanceOf(InvalidPostContentException.class);
  }

  @Test
  void rejectsContentOverMaximumLength() {
    assertThatThrownBy(() -> service.normalizeContent("x".repeat(3001)))
        .isInstanceOf(InvalidPostContentException.class);
  }

  @Test
  void createsPostForAuthenticatedUser() {
    when(userRepository.findById(userId)).thenReturn(Optional.of(user));
    when(user.getId()).thenReturn(userId);
    when(user.getUsername()).thenReturn("creativeuser");
    when(user.getFullName()).thenReturn("Creative User");
    when(profileRepository.findByUserId(userId)).thenReturn(Optional.of(profile));
    when(profile.getProfessionalTitle()).thenReturn("Director");
    when(postRepository.saveAndFlush(any(Post.class))).thenReturn(post);
    when(post.getId()).thenReturn(UUID.randomUUID());
    when(post.getContent()).thenReturn("Created post");
    when(post.getCreatedAt()).thenReturn(Instant.now());
    when(post.getUpdatedAt()).thenReturn(Instant.now());

    var response =
        service.create(new AuthenticatedUser(userId), new CreatePostRequest(" Created post "));

    assertThat(response.content()).isEqualTo("Created post");
    assertThat(response.ownedByCurrentUser()).isTrue();
  }

  @Test
  void mapsOwnershipForCurrentUserAndAnonymousFeed() {
    var row = row(userId);
    when(postRepository.findFeed(any(), any())).thenReturn(new PageImpl<>(List.of(row)));

    assertThat(
            service
                .globalFeed(0, 20, new AuthenticatedUser(userId))
                .content()
                .getFirst()
                .ownedByCurrentUser())
        .isTrue();
    assertThat(service.globalFeed(0, 20, null).content().getFirst().ownedByCurrentUser()).isFalse();
    assertThat(
            service
                .globalFeed(0, 20, new AuthenticatedUser(userId))
                .content()
                .getFirst()
                .likedByCurrentUser())
        .isTrue();
    assertThat(service.globalFeed(0, 20, null).content().getFirst().likedByCurrentUser()).isFalse();
    assertThat(service.globalFeed(0, 20, null).content().getFirst().likeCount()).isEqualTo(4);
  }

  @Test
  void ownerCanDelete() {
    when(postRepository.findById(any())).thenReturn(Optional.of(post));
    when(post.getAuthor()).thenReturn(user);
    when(user.getId()).thenReturn(userId);
    service.delete(UUID.randomUUID(), new AuthenticatedUser(userId));
    verify(postRepository).delete(post);
  }

  @Test
  void nonOwnerCannotDelete() {
    when(postRepository.findById(any())).thenReturn(Optional.of(post));
    when(post.getAuthor()).thenReturn(user);
    when(user.getId()).thenReturn(UUID.randomUUID());
    assertThatThrownBy(() -> service.delete(UUID.randomUUID(), new AuthenticatedUser(userId)))
        .isInstanceOf(PostDeleteForbiddenException.class);
  }

  @Test
  void missingPostThrowsExplicitException() {
    when(postRepository.findProjectedById(any(), any())).thenReturn(Optional.empty());
    assertThatThrownBy(() -> service.find(UUID.randomUUID(), null))
        .isInstanceOf(PostNotFoundException.class);
  }

  @Test
  void rejectsInvalidPagination() {
    assertThatThrownBy(() -> service.validatePagination(-1, 20))
        .isInstanceOf(InvalidPaginationException.class);
    assertThatThrownBy(() -> service.validatePagination(0, 51))
        .isInstanceOf(InvalidPaginationException.class);
  }

  private PostRow row(UUID authorId) {
    var now = Instant.now();
    return new PostRow(
        UUID.randomUUID(),
        "Post",
        now,
        now,
        authorId,
        "creativeuser",
        "Creative User",
        "Director",
        3,
        4,
        true);
  }
}

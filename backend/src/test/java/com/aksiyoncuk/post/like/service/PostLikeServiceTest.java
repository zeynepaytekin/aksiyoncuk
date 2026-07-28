package com.aksiyoncuk.post.like.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.aksiyoncuk.auth.security.AuthenticatedUser;
import com.aksiyoncuk.notification.service.NotificationService;
import com.aksiyoncuk.post.entity.Post;
import com.aksiyoncuk.post.exception.PostNotFoundException;
import com.aksiyoncuk.post.like.repository.PostLikeRepository;
import com.aksiyoncuk.post.repository.PostRepository;
import com.aksiyoncuk.user.entity.User;
import com.aksiyoncuk.user.repository.UserRepository;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class PostLikeServiceTest {

  @Mock private PostLikeRepository likeRepository;
  @Mock private PostRepository postRepository;
  @Mock private UserRepository userRepository;
  @Mock private NotificationService notificationService;
  @Mock private Post post;
  @Mock private User user;
  @Mock private User owner;

  private PostLikeService service;
  private UUID postId;
  private UUID userId;
  private AuthenticatedUser principal;

  @BeforeEach
  void setUp() {
    service =
        new PostLikeService(likeRepository, postRepository, userRepository, notificationService);
    postId = UUID.randomUUID();
    userId = UUID.randomUUID();
    principal = new AuthenticatedUser(userId);
  }

  @Test
  void firstLikeCreatesOneRow() {
    validPostAndUser();
    when(likeRepository.insertIfAbsent(any(), eq(postId), eq(userId), any(Instant.class)))
        .thenReturn(1);
    when(likeRepository.existsByPostIdAndUserId(postId, userId)).thenReturn(true);
    when(likeRepository.countByPostId(postId)).thenReturn(1L);

    var response = service.like(postId, principal);

    assertThat(response.likedByCurrentUser()).isTrue();
    assertThat(response.likeCount()).isEqualTo(1);
    verify(notificationService).postLiked(user, owner, postId);
  }

  @Test
  void repeatedOrConcurrentLikeIsIdempotentWhenInsertConflicts() {
    validPostAndUser();
    when(likeRepository.insertIfAbsent(any(), eq(postId), eq(userId), any(Instant.class)))
        .thenReturn(0);
    when(likeRepository.existsByPostIdAndUserId(postId, userId)).thenReturn(true);
    when(likeRepository.countByPostId(postId)).thenReturn(1L);

    var response = service.like(postId, principal);

    assertThat(response.likedByCurrentUser()).isTrue();
    assertThat(response.likeCount()).isEqualTo(1);
    verify(notificationService, never()).postLiked(any(), any(), any());
  }

  @Test
  void unlikeRemovesLike() {
    when(postRepository.findById(postId)).thenReturn(java.util.Optional.of(post));
    when(likeRepository.deleteByPostIdAndUserId(postId, userId)).thenReturn(1);
    when(likeRepository.countByPostId(postId)).thenReturn(0L);

    var response = service.unlike(postId, principal);

    assertThat(response.likedByCurrentUser()).isFalse();
    assertThat(response.likeCount()).isZero();
  }

  @Test
  void repeatedUnlikeIsIdempotent() {
    when(postRepository.findById(postId)).thenReturn(java.util.Optional.of(post));
    when(likeRepository.deleteByPostIdAndUserId(postId, userId)).thenReturn(0);
    when(likeRepository.countByPostId(postId)).thenReturn(0L);

    var response = service.unlike(postId, principal);

    assertThat(response.likedByCurrentUser()).isFalse();
    assertThat(response.likeCount()).isZero();
  }

  @Test
  void missingPostIsExplicitAndDoesNotWrite() {
    when(postRepository.findById(postId)).thenReturn(java.util.Optional.empty());

    assertThatThrownBy(() -> service.like(postId, principal))
        .isInstanceOf(PostNotFoundException.class);
    verify(likeRepository, never()).insertIfAbsent(any(), any(), any(), any());
  }

  private void validPostAndUser() {
    when(postRepository.findById(postId)).thenReturn(java.util.Optional.of(post));
    when(userRepository.findById(userId)).thenReturn(java.util.Optional.of(user));
    lenient().when(post.getAuthor()).thenReturn(owner);
    lenient().when(user.getId()).thenReturn(userId);
    lenient().when(owner.getId()).thenReturn(UUID.randomUUID());
  }
}

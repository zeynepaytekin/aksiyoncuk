package com.aksiyoncuk.post.comment.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.aksiyoncuk.auth.security.AuthenticatedUser;
import com.aksiyoncuk.post.comment.dto.CommentResponse;
import com.aksiyoncuk.post.comment.dto.CreateCommentRequest;
import com.aksiyoncuk.post.comment.entity.PostComment;
import com.aksiyoncuk.post.comment.exception.CommentDeleteForbiddenException;
import com.aksiyoncuk.post.comment.exception.CommentNotFoundException;
import com.aksiyoncuk.post.comment.exception.InvalidCommentContentException;
import com.aksiyoncuk.post.comment.exception.InvalidCommentPaginationException;
import com.aksiyoncuk.post.comment.repository.CommentRow;
import com.aksiyoncuk.post.comment.repository.PostCommentRepository;
import com.aksiyoncuk.post.entity.Post;
import com.aksiyoncuk.post.exception.PostNotFoundException;
import com.aksiyoncuk.post.repository.PostRepository;
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
class PostCommentServiceTest {

  @Mock private PostCommentRepository commentRepository;
  @Mock private PostRepository postRepository;
  @Mock private UserRepository userRepository;
  @Mock private Post post;
  @Mock private User user;
  @Mock private PostComment comment;

  private PostCommentService service;
  private UUID userId;
  private UUID postId;

  @BeforeEach
  void setUp() {
    service = new PostCommentService(commentRepository, postRepository, userRepository);
    userId = UUID.randomUUID();
    postId = UUID.randomUUID();
  }

  @Test
  void trimsContent() {
    assertThat(service.normalizeContent("  Great project.  ")).isEqualTo("Great project.");
  }

  @Test
  void rejectsBlankAndOversizedContent() {
    assertThatThrownBy(() -> service.normalizeContent("  "))
        .isInstanceOf(InvalidCommentContentException.class);
    assertThatThrownBy(() -> service.normalizeContent("x".repeat(2001)))
        .isInstanceOf(InvalidCommentContentException.class);
  }

  @Test
  void createsCommentForAuthenticatedUser() {
    var commentId = UUID.randomUUID();
    when(postRepository.findById(postId)).thenReturn(Optional.of(post));
    when(userRepository.findById(userId)).thenReturn(Optional.of(user));
    when(commentRepository.saveAndFlush(any(PostComment.class))).thenReturn(comment);
    when(comment.getId()).thenReturn(commentId);
    when(commentRepository.findProjectedById(commentId))
        .thenReturn(Optional.of(row(commentId, userId)));

    var response =
        service.create(
            postId, new AuthenticatedUser(userId), new CreateCommentRequest(" Comment "));

    assertThat(response.content()).isEqualTo("Comment");
    assertThat(response.ownedByCurrentUser()).isTrue();
  }

  @Test
  void missingParentPostIsExplicit() {
    when(postRepository.findById(postId)).thenReturn(Optional.empty());
    assertThatThrownBy(
            () ->
                service.create(
                    postId, new AuthenticatedUser(userId), new CreateCommentRequest("Comment")))
        .isInstanceOf(PostNotFoundException.class);
  }

  @Test
  void mapsAuthenticatedAndAnonymousOwnership() {
    when(postRepository.existsById(postId)).thenReturn(true);
    when(commentRepository.findByPostIdProjected(any(), any()))
        .thenReturn(new PageImpl<>(List.of(row(UUID.randomUUID(), userId))));

    assertThat(
            service
                .list(postId, 0, 20, new AuthenticatedUser(userId))
                .content()
                .getFirst()
                .ownedByCurrentUser())
        .isTrue();
    assertThat(service.list(postId, 0, 20, null).content().getFirst().ownedByCurrentUser())
        .isFalse();
  }

  @Test
  void ownerCanDelete() {
    when(commentRepository.findById(any())).thenReturn(Optional.of(comment));
    when(comment.getAuthor()).thenReturn(user);
    when(user.getId()).thenReturn(userId);
    service.delete(UUID.randomUUID(), new AuthenticatedUser(userId));
    verify(commentRepository).delete(comment);
  }

  @Test
  void nonOwnerCannotDelete() {
    when(commentRepository.findById(any())).thenReturn(Optional.of(comment));
    when(comment.getAuthor()).thenReturn(user);
    when(user.getId()).thenReturn(UUID.randomUUID());
    assertThatThrownBy(() -> service.delete(UUID.randomUUID(), new AuthenticatedUser(userId)))
        .isInstanceOf(CommentDeleteForbiddenException.class);
  }

  @Test
  void missingCommentIsExplicit() {
    when(commentRepository.findById(any())).thenReturn(Optional.empty());
    assertThatThrownBy(() -> service.delete(UUID.randomUUID(), new AuthenticatedUser(userId)))
        .isInstanceOf(CommentNotFoundException.class);
  }

  @Test
  void rejectsInvalidPagination() {
    assertThatThrownBy(() -> service.validatePagination(-1, 20))
        .isInstanceOf(InvalidCommentPaginationException.class);
    assertThatThrownBy(() -> service.validatePagination(0, 51))
        .isInstanceOf(InvalidCommentPaginationException.class);
  }

  @Test
  void responseMappingNeverNeedsPrivateUserFields() {
    CommentResponse response = CommentResponse.from(row(UUID.randomUUID(), userId), userId);
    assertThat(response.author().username()).isEqualTo("creativeuser");
    assertThat(response.author().professionalTitle()).isEqualTo("Director");
  }

  private CommentRow row(UUID commentId, UUID authorId) {
    var now = Instant.now();
    return new CommentRow(
        commentId,
        postId,
        "Comment",
        now,
        now,
        authorId,
        "creativeuser",
        "Creative User",
        "Director");
  }
}

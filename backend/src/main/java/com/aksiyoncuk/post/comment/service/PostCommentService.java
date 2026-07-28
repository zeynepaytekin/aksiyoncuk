package com.aksiyoncuk.post.comment.service;

import com.aksiyoncuk.auth.exception.AuthException;
import com.aksiyoncuk.auth.security.AuthenticatedUser;
import com.aksiyoncuk.notification.service.NotificationService;
import com.aksiyoncuk.post.comment.dto.CommentPageResponse;
import com.aksiyoncuk.post.comment.dto.CommentResponse;
import com.aksiyoncuk.post.comment.dto.CreateCommentRequest;
import com.aksiyoncuk.post.comment.entity.PostComment;
import com.aksiyoncuk.post.comment.exception.CommentDeleteForbiddenException;
import com.aksiyoncuk.post.comment.exception.CommentNotFoundException;
import com.aksiyoncuk.post.comment.exception.InvalidCommentContentException;
import com.aksiyoncuk.post.comment.exception.InvalidCommentPaginationException;
import com.aksiyoncuk.post.comment.repository.PostCommentRepository;
import com.aksiyoncuk.post.exception.PostNotFoundException;
import com.aksiyoncuk.post.repository.PostRepository;
import com.aksiyoncuk.user.repository.UserRepository;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PostCommentService {

  private static final int MAXIMUM_CONTENT_LENGTH = 2000;
  private static final Sort OLDEST_FIRST =
      Sort.by(Sort.Order.asc("createdAt"), Sort.Order.asc("id"));

  private final PostCommentRepository commentRepository;
  private final PostRepository postRepository;
  private final UserRepository userRepository;
  private final NotificationService notificationService;

  public PostCommentService(
      PostCommentRepository commentRepository,
      PostRepository postRepository,
      UserRepository userRepository,
      NotificationService notificationService) {
    this.commentRepository = commentRepository;
    this.postRepository = postRepository;
    this.userRepository = userRepository;
    this.notificationService = notificationService;
  }

  @Transactional
  public CommentResponse create(
      UUID postId, AuthenticatedUser principal, CreateCommentRequest request) {
    var content = normalizeContent(request == null ? null : request.content());
    var post = postRepository.findById(postId).orElseThrow(PostNotFoundException::new);
    var author =
        userRepository
            .findById(principal.userId())
            .orElseThrow(
                () -> new AuthException("INVALID_ACCESS_TOKEN", "Access token is invalid"));
    var comment = commentRepository.saveAndFlush(new PostComment(post, author, content));
    if (!post.getAuthor().getId().equals(author.getId())) {
      notificationService.postCommented(author, post.getAuthor(), postId, comment.getId());
    }
    return commentRepository
        .findProjectedById(comment.getId())
        .map(row -> CommentResponse.from(row, principal.userId()))
        .orElseThrow(CommentNotFoundException::new);
  }

  @Transactional(readOnly = true)
  public CommentPageResponse list(UUID postId, int page, int size, AuthenticatedUser principal) {
    validatePagination(page, size);
    if (!postRepository.existsById(postId)) {
      throw new PostNotFoundException();
    }
    var rows =
        commentRepository.findByPostIdProjected(postId, PageRequest.of(page, size, OLDEST_FIRST));
    var currentUserId = principal == null ? null : principal.userId();
    return new CommentPageResponse(
        rows.getContent().stream().map(row -> CommentResponse.from(row, currentUserId)).toList(),
        rows.getNumber(),
        rows.getSize(),
        rows.getTotalElements(),
        rows.getTotalPages(),
        rows.isFirst(),
        rows.isLast());
  }

  @Transactional
  public void delete(UUID commentId, AuthenticatedUser principal) {
    var comment = commentRepository.findById(commentId).orElseThrow(CommentNotFoundException::new);
    if (!comment.getAuthor().getId().equals(principal.userId())) {
      throw new CommentDeleteForbiddenException();
    }
    commentRepository.delete(comment);
  }

  String normalizeContent(String content) {
    if (content == null) {
      throw new InvalidCommentContentException("Comment content is required");
    }
    var normalized = content.trim();
    if (normalized.isBlank()) {
      throw new InvalidCommentContentException("Comment content must not be blank");
    }
    if (normalized.length() > MAXIMUM_CONTENT_LENGTH) {
      throw new InvalidCommentContentException(
          "Comment content must not exceed " + MAXIMUM_CONTENT_LENGTH + " characters");
    }
    return normalized;
  }

  void validatePagination(int page, int size) {
    if (page < 0 || size < 1 || size > 50) {
      throw new InvalidCommentPaginationException();
    }
  }
}

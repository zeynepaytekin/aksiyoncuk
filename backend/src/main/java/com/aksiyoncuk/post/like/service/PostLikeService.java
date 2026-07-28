package com.aksiyoncuk.post.like.service;

import com.aksiyoncuk.auth.exception.AuthException;
import com.aksiyoncuk.auth.security.AuthenticatedUser;
import com.aksiyoncuk.notification.service.NotificationService;
import com.aksiyoncuk.post.entity.Post;
import com.aksiyoncuk.post.exception.PostNotFoundException;
import com.aksiyoncuk.post.like.dto.PostLikeResponse;
import com.aksiyoncuk.post.like.repository.PostLikeRepository;
import com.aksiyoncuk.post.repository.PostRepository;
import com.aksiyoncuk.user.repository.UserRepository;
import java.time.Instant;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PostLikeService {

  private final PostLikeRepository likeRepository;
  private final PostRepository postRepository;
  private final UserRepository userRepository;
  private final NotificationService notificationService;

  public PostLikeService(
      PostLikeRepository likeRepository,
      PostRepository postRepository,
      UserRepository userRepository,
      NotificationService notificationService) {
    this.likeRepository = likeRepository;
    this.postRepository = postRepository;
    this.userRepository = userRepository;
    this.notificationService = notificationService;
  }

  @Transactional
  public PostLikeResponse like(UUID postId, AuthenticatedUser principal) {
    var post = requirePost(postId);
    var actor = requireUser(principal.userId());
    if (likeRepository.insertIfAbsent(UUID.randomUUID(), postId, principal.userId(), Instant.now())
            == 1
        && !post.getAuthor().getId().equals(actor.getId())) {
      notificationService.postLiked(actor, post.getAuthor(), postId);
    }
    return response(postId, principal.userId(), true);
  }

  @Transactional
  public PostLikeResponse unlike(UUID postId, AuthenticatedUser principal) {
    requirePost(postId);
    likeRepository.deleteByPostIdAndUserId(postId, principal.userId());
    return response(postId, principal.userId(), false);
  }

  private Post requirePost(UUID postId) {
    return postRepository.findById(postId).orElseThrow(PostNotFoundException::new);
  }

  private com.aksiyoncuk.user.entity.User requireUser(UUID userId) {
    return userRepository
        .findById(userId)
        .orElseThrow(() -> new AuthException("INVALID_ACCESS_TOKEN", "Access token is invalid"));
  }

  private PostLikeResponse response(UUID postId, UUID userId, boolean expectedLiked) {
    var liked = expectedLiked ? likeRepository.existsByPostIdAndUserId(postId, userId) : false;
    return new PostLikeResponse(postId, liked, likeRepository.countByPostId(postId));
  }
}

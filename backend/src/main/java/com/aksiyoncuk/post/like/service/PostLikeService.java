package com.aksiyoncuk.post.like.service;

import com.aksiyoncuk.auth.exception.AuthException;
import com.aksiyoncuk.auth.security.AuthenticatedUser;
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

  public PostLikeService(
      PostLikeRepository likeRepository,
      PostRepository postRepository,
      UserRepository userRepository) {
    this.likeRepository = likeRepository;
    this.postRepository = postRepository;
    this.userRepository = userRepository;
  }

  @Transactional
  public PostLikeResponse like(UUID postId, AuthenticatedUser principal) {
    requirePost(postId);
    requireUser(principal.userId());
    likeRepository.insertIfAbsent(UUID.randomUUID(), postId, principal.userId(), Instant.now());
    return response(postId, principal.userId(), true);
  }

  @Transactional
  public PostLikeResponse unlike(UUID postId, AuthenticatedUser principal) {
    requirePost(postId);
    likeRepository.deleteByPostIdAndUserId(postId, principal.userId());
    return response(postId, principal.userId(), false);
  }

  private void requirePost(UUID postId) {
    if (!postRepository.existsById(postId)) {
      throw new PostNotFoundException();
    }
  }

  private void requireUser(UUID userId) {
    if (!userRepository.existsById(userId)) {
      throw new AuthException("INVALID_ACCESS_TOKEN", "Access token is invalid");
    }
  }

  private PostLikeResponse response(UUID postId, UUID userId, boolean expectedLiked) {
    var liked = expectedLiked ? likeRepository.existsByPostIdAndUserId(postId, userId) : false;
    return new PostLikeResponse(postId, liked, likeRepository.countByPostId(postId));
  }
}

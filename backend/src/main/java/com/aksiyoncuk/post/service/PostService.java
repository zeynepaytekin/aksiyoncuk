package com.aksiyoncuk.post.service;

import com.aksiyoncuk.auth.exception.AuthException;
import com.aksiyoncuk.auth.security.AuthenticatedUser;
import com.aksiyoncuk.post.dto.CreatePostRequest;
import com.aksiyoncuk.post.dto.PostPageResponse;
import com.aksiyoncuk.post.dto.PostResponse;
import com.aksiyoncuk.post.entity.Post;
import com.aksiyoncuk.post.exception.InvalidPaginationException;
import com.aksiyoncuk.post.exception.InvalidPostContentException;
import com.aksiyoncuk.post.exception.PostDeleteForbiddenException;
import com.aksiyoncuk.post.exception.PostNotFoundException;
import com.aksiyoncuk.post.repository.PostRepository;
import com.aksiyoncuk.post.repository.PostRow;
import com.aksiyoncuk.profile.repository.ProfileRepository;
import com.aksiyoncuk.user.repository.UserRepository;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PostService {

  private static final int MAXIMUM_CONTENT_LENGTH = 3000;
  private static final Sort NEWEST_FIRST =
      Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"));

  private final PostRepository postRepository;
  private final UserRepository userRepository;
  private final ProfileRepository profileRepository;

  public PostService(
      PostRepository postRepository,
      UserRepository userRepository,
      ProfileRepository profileRepository) {
    this.postRepository = postRepository;
    this.userRepository = userRepository;
    this.profileRepository = profileRepository;
  }

  @Transactional
  public PostResponse create(AuthenticatedUser principal, CreatePostRequest request) {
    var content = normalizeContent(request == null ? null : request.content());
    var user =
        userRepository
            .findById(principal.userId())
            .orElseThrow(
                () -> new AuthException("INVALID_ACCESS_TOKEN", "Access token is invalid"));
    var profile =
        profileRepository
            .findByUserId(user.getId())
            .orElseThrow(
                () -> new AuthException("INVALID_ACCESS_TOKEN", "Access token is invalid"));
    var post = postRepository.saveAndFlush(new Post(user, content));
    return PostResponse.from(
        new PostRow(
            post.getId(),
            post.getContent(),
            post.getCreatedAt(),
            post.getUpdatedAt(),
            user.getId(),
            user.getUsername(),
            user.getFullName(),
            profile.getProfessionalTitle(),
            0),
        user.getId());
  }

  @Transactional(readOnly = true)
  public PostPageResponse globalFeed(int page, int size, AuthenticatedUser principal) {
    validatePagination(page, size);
    return response(
        postRepository.findFeed(PageRequest.of(page, size, NEWEST_FIRST)), userId(principal));
  }

  @Transactional(readOnly = true)
  public PostPageResponse currentUserFeed(int page, int size, AuthenticatedUser principal) {
    validatePagination(page, size);
    return response(
        postRepository.findByAuthorIdProjected(
            principal.userId(), PageRequest.of(page, size, NEWEST_FIRST)),
        principal.userId());
  }

  @Transactional(readOnly = true)
  public PostResponse find(UUID postId, AuthenticatedUser principal) {
    return postRepository
        .findProjectedById(postId)
        .map(row -> PostResponse.from(row, userId(principal)))
        .orElseThrow(PostNotFoundException::new);
  }

  @Transactional
  public void delete(UUID postId, AuthenticatedUser principal) {
    var post = postRepository.findById(postId).orElseThrow(PostNotFoundException::new);
    if (!post.getAuthor().getId().equals(principal.userId())) {
      throw new PostDeleteForbiddenException();
    }
    postRepository.delete(post);
  }

  String normalizeContent(String content) {
    if (content == null) {
      throw new InvalidPostContentException("Post content is required");
    }
    var normalized = content.trim();
    if (normalized.isBlank()) {
      throw new InvalidPostContentException("Post content must not be blank");
    }
    if (normalized.length() > MAXIMUM_CONTENT_LENGTH) {
      throw new InvalidPostContentException(
          "Post content must not exceed " + MAXIMUM_CONTENT_LENGTH + " characters");
    }
    return normalized;
  }

  void validatePagination(int page, int size) {
    if (page < 0 || size < 1 || size > 50) {
      throw new InvalidPaginationException();
    }
  }

  private PostPageResponse response(Page<PostRow> rows, UUID currentUserId) {
    return new PostPageResponse(
        rows.getContent().stream().map(row -> PostResponse.from(row, currentUserId)).toList(),
        rows.getNumber(),
        rows.getSize(),
        rows.getTotalElements(),
        rows.getTotalPages(),
        rows.isFirst(),
        rows.isLast());
  }

  private UUID userId(AuthenticatedUser principal) {
    return principal == null ? null : principal.userId();
  }
}

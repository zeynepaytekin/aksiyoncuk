package com.aksiyoncuk.network.service;

import com.aksiyoncuk.auth.security.AuthenticatedUser;
import com.aksiyoncuk.network.dto.*;
import com.aksiyoncuk.network.exception.InvalidNetworkPaginationException;
import com.aksiyoncuk.network.exception.SelfFollowNotAllowedException;
import com.aksiyoncuk.network.repository.NetworkUserRow;
import com.aksiyoncuk.network.repository.UserFollowRepository;
import com.aksiyoncuk.profile.exception.InvalidProfileUpdateException;
import com.aksiyoncuk.profile.exception.ProfileNotFoundException;
import com.aksiyoncuk.user.entity.User;
import com.aksiyoncuk.user.repository.UserRepository;
import java.util.Locale;
import java.util.UUID;
import java.util.regex.Pattern;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class FollowService {
  private static final Pattern USERNAME_PATTERN = Pattern.compile("[a-z0-9._-]{3,30}");
  private static final Sort NEWEST = Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"));

  private final UserRepository users;
  private final UserFollowRepository follows;

  public FollowService(UserRepository users, UserFollowRepository follows) {
    this.users = users;
    this.follows = follows;
  }

  @Transactional
  public FollowResponse follow(AuthenticatedUser principal, String username) {
    var target = target(username);
    rejectSelf(principal.userId(), target.getId());
    follows.insertIfAbsent(principal.userId(), target.getId());
    return response(target, true);
  }

  @Transactional
  public FollowResponse unfollow(AuthenticatedUser principal, String username) {
    var target = target(username);
    rejectSelf(principal.userId(), target.getId());
    follows.deleteByFollowerIdAndFollowedId(principal.userId(), target.getId());
    return response(target, false);
  }

  @Transactional(readOnly = true)
  public NetworkPageResponse followers(
      String username, int page, int size, AuthenticatedUser principal) {
    var target = target(username);
    return page(
        follows.followers(
            target.getId(), principal == null ? null : principal.userId(), pageable(page, size)));
  }

  @Transactional(readOnly = true)
  public NetworkPageResponse following(
      String username, int page, int size, AuthenticatedUser principal) {
    var target = target(username);
    return page(
        follows.following(
            target.getId(), principal == null ? null : principal.userId(), pageable(page, size)));
  }

  @Transactional(readOnly = true)
  public NetworkSummaryResponse summary(AuthenticatedUser principal) {
    var id = principal.userId();
    return new NetworkSummaryResponse(
        follows.countByFollowedId(id), follows.countByFollowerId(id), follows.countMutual(id));
  }

  public String normalizeUsername(String username) {
    var normalized = username == null ? "" : username.trim().toLowerCase(Locale.ROOT);
    if (!USERNAME_PATTERN.matcher(normalized).matches()) {
      throw new InvalidProfileUpdateException("Username path is invalid");
    }
    return normalized;
  }

  private User target(String username) {
    return users
        .findByUsername(normalizeUsername(username))
        .orElseThrow(ProfileNotFoundException::new);
  }

  private void rejectSelf(UUID current, UUID target) {
    if (current.equals(target)) throw new SelfFollowNotAllowedException();
  }

  private FollowResponse response(User target, boolean followed) {
    return new FollowResponse(
        target.getId(),
        target.getUsername(),
        followed,
        follows.countByFollowedId(target.getId()),
        follows.countByFollowerId(target.getId()));
  }

  private PageRequest pageable(int page, int size) {
    if (page < 0 || size < 1 || size > 50) throw new InvalidNetworkPaginationException();
    return PageRequest.of(page, size, NEWEST);
  }

  private NetworkPageResponse page(Page<NetworkUserRow> page) {
    return new NetworkPageResponse(
        page.getContent().stream()
            .map(
                row ->
                    new NetworkUserResponse(
                        row.getId(),
                        row.getUsername(),
                        row.getFullName(),
                        row.getProfessionalTitle(),
                        row.getFollowedByCurrentUser()))
            .toList(),
        page.getNumber(),
        page.getSize(),
        page.getTotalElements(),
        page.getTotalPages(),
        page.isFirst(),
        page.isLast());
  }
}

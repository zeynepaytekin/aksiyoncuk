package com.aksiyoncuk.network.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

import com.aksiyoncuk.auth.security.AuthenticatedUser;
import com.aksiyoncuk.network.exception.InvalidNetworkPaginationException;
import com.aksiyoncuk.network.exception.SelfFollowNotAllowedException;
import com.aksiyoncuk.network.repository.NetworkUserRow;
import com.aksiyoncuk.network.repository.UserFollowRepository;
import com.aksiyoncuk.notification.service.NotificationService;
import com.aksiyoncuk.profile.exception.ProfileNotFoundException;
import com.aksiyoncuk.user.entity.User;
import com.aksiyoncuk.user.repository.UserRepository;
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
class FollowServiceTest {
  @Mock private UserRepository users;
  @Mock private UserFollowRepository follows;
  @Mock private NotificationService notifications;
  @Mock private User target;
  @Mock private User actor;
  @Mock private NetworkUserRow row;

  private FollowService service;
  private UUID currentId;
  private UUID targetId;

  @BeforeEach
  void setUp() {
    service = new FollowService(users, follows, notifications);
    currentId = UUID.randomUUID();
    targetId = UUID.randomUUID();
    lenient().when(target.getId()).thenReturn(targetId);
    lenient().when(target.getUsername()).thenReturn("creativeuser");
    lenient().when(users.findByUsername("creativeuser")).thenReturn(Optional.of(target));
  }

  @Test
  void normalizesUsernameAndCreatesAnIdempotentDatabaseInsert() {
    service.follow(principal(), " CreativeUser ");
    service.follow(principal(), "CREATIVEUSER");
    verify(follows, times(2)).insertIfAbsent(currentId, targetId);
  }

  @Test
  void firstFollowCreatesOneNotificationAndRepeatedFollowDoesNot() {
    when(follows.insertIfAbsent(currentId, targetId)).thenReturn(1, 0);
    when(users.findById(currentId)).thenReturn(Optional.of(actor));

    service.follow(principal(), "creativeuser");
    service.follow(principal(), "creativeuser");

    verify(notifications).userFollowed(actor, target);
  }

  @Test
  void unfollowIsIdempotent() {
    service.unfollow(principal(), "creativeuser");
    service.unfollow(principal(), "creativeuser");
    verify(follows, times(2)).deleteByFollowerIdAndFollowedId(currentId, targetId);
  }

  @Test
  void rejectsSelfFollowAndMissingTarget() {
    when(target.getId()).thenReturn(currentId);
    assertThatThrownBy(() -> service.follow(principal(), "creativeuser"))
        .isInstanceOf(SelfFollowNotAllowedException.class);
    when(users.findByUsername("missing")).thenReturn(Optional.empty());
    assertThatThrownBy(() -> service.follow(principal(), "missing"))
        .isInstanceOf(ProfileNotFoundException.class);
  }

  @Test
  void responseContainsAccurateCounts() {
    when(follows.countByFollowedId(targetId)).thenReturn(42L);
    when(follows.countByFollowerId(targetId)).thenReturn(18L);
    var response = service.follow(principal(), "creativeuser");
    assertThat(response.followerCount()).isEqualTo(42);
    assertThat(response.followingCount()).isEqualTo(18);
    assertThat(response.followedByCurrentUser()).isTrue();
  }

  @Test
  void anonymousAndAuthenticatedListingViewerStateComesFromProjection() {
    when(row.getId()).thenReturn(targetId);
    when(row.getUsername()).thenReturn("listed");
    when(row.getFullName()).thenReturn("Listed User");
    when(row.getFollowedByCurrentUser()).thenReturn(false);
    when(follows.followers(eq(targetId), isNull(), any())).thenReturn(new PageImpl<>(List.of(row)));
    var anonymous = service.followers("creativeuser", 0, 20, null);
    assertThat(anonymous.content().getFirst().followedByCurrentUser()).isFalse();

    when(row.getFollowedByCurrentUser()).thenReturn(true);
    when(follows.following(eq(targetId), eq(currentId), any()))
        .thenReturn(new PageImpl<>(List.of(row)));
    var authenticated = service.following("creativeuser", 0, 20, principal());
    assertThat(authenticated.content().getFirst().followedByCurrentUser()).isTrue();
  }

  @Test
  void summaryUsesAggregateCountsIncludingMutuals() {
    when(follows.countByFollowedId(currentId)).thenReturn(4L);
    when(follows.countByFollowerId(currentId)).thenReturn(3L);
    when(follows.countMutual(currentId)).thenReturn(2L);
    var summary = service.summary(principal());
    assertThat(summary.followerCount()).isEqualTo(4);
    assertThat(summary.followingCount()).isEqualTo(3);
    assertThat(summary.mutualCount()).isEqualTo(2);
  }

  @Test
  void validatesPagination() {
    assertThatThrownBy(() -> service.followers("creativeuser", -1, 20, null))
        .isInstanceOf(InvalidNetworkPaginationException.class);
    assertThatThrownBy(() -> service.following("creativeuser", 0, 51, null))
        .isInstanceOf(InvalidNetworkPaginationException.class);
  }

  private AuthenticatedUser principal() {
    return new AuthenticatedUser(currentId);
  }
}

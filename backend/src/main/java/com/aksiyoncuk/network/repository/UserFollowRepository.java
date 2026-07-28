package com.aksiyoncuk.network.repository;

import com.aksiyoncuk.network.entity.UserFollow;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.lang.Nullable;

public interface UserFollowRepository extends JpaRepository<UserFollow, UUID> {
  boolean existsByFollowerIdAndFollowedId(UUID followerId, UUID followedId);

  long countByFollowedId(UUID followedId);

  long countByFollowerId(UUID followerId);

  @Modifying
  long deleteByFollowerIdAndFollowedId(UUID followerId, UUID followedId);

  @Modifying
  @Query(
      value =
          """
          insert into user_follows (id, follower_id, followed_id, created_at)
          values (gen_random_uuid(), :followerId, :followedId, current_timestamp)
          on conflict (follower_id, followed_id) do nothing
          """,
      nativeQuery = true)
  int insertIfAbsent(@Param("followerId") UUID followerId, @Param("followedId") UUID followedId);

  @Query(
      """
      select count(f)
      from UserFollow f
      where f.follower.id = :userId
        and exists (
          select reciprocal.id from UserFollow reciprocal
          where reciprocal.follower.id = f.followed.id
            and reciprocal.followed.id = :userId
        )
      """)
  long countMutual(@Param("userId") UUID userId);

  @Query(
      value =
          """
          select u.id as id, u.username as username, u.fullName as fullName,
                 p.professionalTitle as professionalTitle,
                 case when :viewerId is not null and exists (
                   select viewerFollow.id from UserFollow viewerFollow
                   where viewerFollow.follower.id = :viewerId
                     and viewerFollow.followed.id = u.id
                 ) then true else false end as followedByCurrentUser
          from UserFollow f
          join f.follower u
          left join Profile p on p.user.id = u.id
          where f.followed.id = :targetId
          """,
      countQuery = "select count(f) from UserFollow f where f.followed.id = :targetId")
  Page<NetworkUserRow> followers(
      @Param("targetId") UUID targetId,
      @Param("viewerId") @Nullable UUID viewerId,
      Pageable pageable);

  @Query(
      value =
          """
          select u.id as id, u.username as username, u.fullName as fullName,
                 p.professionalTitle as professionalTitle,
                 case when :viewerId is not null and exists (
                   select viewerFollow.id from UserFollow viewerFollow
                   where viewerFollow.follower.id = :viewerId
                     and viewerFollow.followed.id = u.id
                 ) then true else false end as followedByCurrentUser
          from UserFollow f
          join f.followed u
          left join Profile p on p.user.id = u.id
          where f.follower.id = :targetId
          """,
      countQuery = "select count(f) from UserFollow f where f.follower.id = :targetId")
  Page<NetworkUserRow> following(
      @Param("targetId") UUID targetId,
      @Param("viewerId") @Nullable UUID viewerId,
      Pageable pageable);
}

package com.aksiyoncuk.user.repository;

import com.aksiyoncuk.user.entity.User;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<User, UUID> {

  boolean existsByEmail(String email);

  boolean existsByUsername(String username);

  Optional<User> findByEmailOrUsername(String email, String username);

  Optional<User> findByUsername(String username);

  @Query(
      value =
          """
          select new com.aksiyoncuk.user.repository.UserSearchRow(
            u.id, u.username, u.fullName, p.professionalTitle, p.location,
            (select count(follower) from UserFollow follower where follower.followed = u),
            (select count(following) from UserFollow following where following.follower = u),
            case when :viewerId is not null and exists (
              select viewerFollow.id from UserFollow viewerFollow
              where viewerFollow.follower.id = :viewerId and viewerFollow.followed = u
            ) then true else false end)
          from User u
          left join Profile p on p.user = u
          where lower(u.username) like :pattern escape '!'
             or lower(u.fullName) like :pattern escape '!'
             or lower(coalesce(p.professionalTitle, '')) like :pattern escape '!'
             or lower(coalesce(p.location, '')) like :pattern escape '!'
          order by case
            when lower(u.username) = :normalizedQuery then 0
            when lower(u.username) like :prefixPattern escape '!' then 1
            when lower(u.fullName) like :pattern escape '!' then 2
            else 3 end,
            u.username asc, u.id asc
          """,
      countQuery =
          """
          select count(u) from User u
          left join Profile p on p.user = u
          where lower(u.username) like :pattern escape '!'
             or lower(u.fullName) like :pattern escape '!'
             or lower(coalesce(p.professionalTitle, '')) like :pattern escape '!'
             or lower(coalesce(p.location, '')) like :pattern escape '!'
          """)
  Page<UserSearchRow> search(
      @Param("normalizedQuery") String normalizedQuery,
      @Param("pattern") String pattern,
      @Param("prefixPattern") String prefixPattern,
      @Param("viewerId") UUID viewerId,
      Pageable pageable);
}

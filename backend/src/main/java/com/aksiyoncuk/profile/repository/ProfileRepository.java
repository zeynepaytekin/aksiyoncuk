package com.aksiyoncuk.profile.repository;

import com.aksiyoncuk.profile.entity.Profile;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

public interface ProfileRepository extends JpaRepository<Profile, UUID> {

  boolean existsByUserId(UUID userId);

  @EntityGraph(attributePaths = "user")
  Optional<Profile> findByUserId(UUID userId);

  @EntityGraph(attributePaths = "user")
  Optional<Profile> findByUserUsername(String username);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @EntityGraph(attributePaths = {"user", "avatarMedia", "coverMedia"})
  Optional<Profile> findLockedByUserId(UUID userId);
}

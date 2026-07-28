package com.aksiyoncuk.profile.repository;

import com.aksiyoncuk.profile.entity.Profile;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProfileRepository extends JpaRepository<Profile, UUID> {

  boolean existsByUserId(UUID userId);

  @EntityGraph(attributePaths = "user")
  Optional<Profile> findByUserId(UUID userId);

  @EntityGraph(attributePaths = "user")
  Optional<Profile> findByUserUsername(String username);
}

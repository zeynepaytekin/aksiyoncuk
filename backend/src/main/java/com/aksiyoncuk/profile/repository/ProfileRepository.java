package com.aksiyoncuk.profile.repository;

import com.aksiyoncuk.profile.entity.Profile;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProfileRepository extends JpaRepository<Profile, UUID> {

  boolean existsByUserId(UUID userId);
}

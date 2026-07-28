package com.aksiyoncuk.user.repository;

import com.aksiyoncuk.user.entity.User;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, UUID> {

  boolean existsByEmail(String email);

  boolean existsByUsername(String username);

  Optional<User> findByEmailOrUsername(String email, String username);
}

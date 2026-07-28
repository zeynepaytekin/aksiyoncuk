package com.aksiyoncuk.user.service;

import com.aksiyoncuk.profile.entity.Profile;
import com.aksiyoncuk.profile.repository.ProfileRepository;
import com.aksiyoncuk.user.dto.RegistrationRequest;
import com.aksiyoncuk.user.dto.RegistrationResponse;
import com.aksiyoncuk.user.entity.User;
import com.aksiyoncuk.user.exception.DuplicateEmailException;
import com.aksiyoncuk.user.exception.DuplicateUsernameException;
import com.aksiyoncuk.user.repository.UserRepository;
import java.util.Locale;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserRegistrationService {

  private static final String EMAIL_CONSTRAINT = "uk_users_email";
  private static final String USERNAME_CONSTRAINT = "uk_users_username";

  private final UserRepository userRepository;
  private final ProfileRepository profileRepository;
  private final PasswordEncoder passwordEncoder;

  public UserRegistrationService(
      UserRepository userRepository,
      ProfileRepository profileRepository,
      PasswordEncoder passwordEncoder) {
    this.userRepository = userRepository;
    this.profileRepository = profileRepository;
    this.passwordEncoder = passwordEncoder;
  }

  @Transactional
  public RegistrationResponse register(RegistrationRequest request) {
    var email = normalizeEmail(request.email());
    var username = normalizeUsername(request.username());
    var fullName = request.fullName().trim();

    if (userRepository.existsByEmail(email)) {
      throw new DuplicateEmailException();
    }
    if (userRepository.existsByUsername(username)) {
      throw new DuplicateUsernameException();
    }

    var user = new User(email, username, passwordEncoder.encode(request.password()), fullName);

    try {
      userRepository.saveAndFlush(user);
      profileRepository.saveAndFlush(new Profile(user));
    } catch (DataIntegrityViolationException exception) {
      throw translateUniqueConstraint(exception);
    }

    return RegistrationResponse.from(user);
  }

  public String normalizeEmail(String email) {
    return email.trim().toLowerCase(Locale.ROOT);
  }

  public String normalizeUsername(String username) {
    return username.trim().toLowerCase(Locale.ROOT);
  }

  private RuntimeException translateUniqueConstraint(DataIntegrityViolationException exception) {
    var details = exceptionDetails(exception);
    if (details.contains(EMAIL_CONSTRAINT)) {
      return new DuplicateEmailException();
    }
    if (details.contains(USERNAME_CONSTRAINT)) {
      return new DuplicateUsernameException();
    }
    return exception;
  }

  private String exceptionDetails(Throwable exception) {
    var details = new StringBuilder();
    var current = exception;
    while (current != null) {
      if (current.getMessage() != null) {
        details.append(current.getMessage().toLowerCase(Locale.ROOT)).append(' ');
      }
      current = current.getCause();
    }
    return details.toString();
  }
}

package com.aksiyoncuk.user.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.aksiyoncuk.profile.entity.Profile;
import com.aksiyoncuk.profile.repository.ProfileRepository;
import com.aksiyoncuk.user.dto.RegistrationRequest;
import com.aksiyoncuk.user.entity.User;
import com.aksiyoncuk.user.exception.DuplicateEmailException;
import com.aksiyoncuk.user.exception.DuplicateUsernameException;
import com.aksiyoncuk.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class UserRegistrationServiceTest {

  @Mock private UserRepository userRepository;
  @Mock private ProfileRepository profileRepository;
  @Mock private PasswordEncoder passwordEncoder;

  private UserRegistrationService service;

  @BeforeEach
  void setUp() {
    service = new UserRegistrationService(userRepository, profileRepository, passwordEncoder);
  }

  @Test
  void normalizesEmailWithTrimAndLocaleRootLowercase() {
    assertThat(service.normalizeEmail("  USER@EXAMPLE.COM ")).isEqualTo("user@example.com");
  }

  @Test
  void normalizesUsernameWithTrimAndLocaleRootLowercase() {
    assertThat(service.normalizeUsername("  Creative.User_1 ")).isEqualTo("creative.user_1");
  }

  @Test
  void hashesPasswordAndDoesNotPutPasswordInResponse() {
    when(passwordEncoder.encode("ExamplePassword123!")).thenReturn("$2a$10$encoded");
    when(userRepository.saveAndFlush(any(User.class)))
        .thenAnswer(invocation -> invocation.getArgument(0, User.class));

    var response = service.register(request());

    var userCaptor = ArgumentCaptor.forClass(User.class);
    verify(userRepository).saveAndFlush(userCaptor.capture());
    verify(passwordEncoder).encode("ExamplePassword123!");
    assertThat(userCaptor.getValue().getPasswordHash()).isEqualTo("$2a$10$encoded");
    assertThat(response.toString())
        .doesNotContain("ExamplePassword123!")
        .doesNotContain("$2a$10$encoded")
        .doesNotContainIgnoringCase("password");
  }

  @Test
  void rejectsDuplicateEmailBeforeHashing() {
    when(userRepository.existsByEmail("user@example.com")).thenReturn(true);

    assertThatThrownBy(() -> service.register(request()))
        .isInstanceOf(DuplicateEmailException.class);
  }

  @Test
  void rejectsDuplicateUsernameBeforeHashing() {
    when(userRepository.existsByUsername("creativeuser")).thenReturn(true);

    assertThatThrownBy(() -> service.register(request()))
        .isInstanceOf(DuplicateUsernameException.class);
  }

  @Test
  void createsEmptyProfileForSavedUser() {
    when(passwordEncoder.encode(any())).thenReturn("$2a$10$encoded");
    when(userRepository.saveAndFlush(any(User.class)))
        .thenAnswer(invocation -> invocation.getArgument(0, User.class));

    service.register(request());

    var profileCaptor = ArgumentCaptor.forClass(Profile.class);
    verify(profileRepository).saveAndFlush(profileCaptor.capture());
    var profile = profileCaptor.getValue();
    assertThat(profile.getUser().getEmail()).isEqualTo("user@example.com");
    assertThat(profile.getProfessionalTitle()).isNull();
    assertThat(profile.getBio()).isNull();
    assertThat(profile.getLocation()).isNull();
    assertThat(profile.getWebsiteUrl()).isNull();
  }

  @Test
  void translatesConcurrentEmailConstraintViolation() {
    when(passwordEncoder.encode(any())).thenReturn("$2a$10$encoded");
    when(userRepository.saveAndFlush(any(User.class)))
        .thenThrow(new DataIntegrityViolationException("violates constraint uk_users_email"));

    assertThatThrownBy(() -> service.register(request()))
        .isInstanceOf(DuplicateEmailException.class);
  }

  @Test
  void translatesConcurrentUsernameConstraintViolation() {
    when(passwordEncoder.encode(any())).thenReturn("$2a$10$encoded");
    when(userRepository.saveAndFlush(any(User.class)))
        .thenThrow(new DataIntegrityViolationException("violates constraint uk_users_username"));

    assertThatThrownBy(() -> service.register(request()))
        .isInstanceOf(DuplicateUsernameException.class);
  }

  private RegistrationRequest request() {
    return new RegistrationRequest(
        " USER@EXAMPLE.COM ", " CreativeUser ", "ExamplePassword123!", " Creative User ");
  }
}

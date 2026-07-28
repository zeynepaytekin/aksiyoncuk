package com.aksiyoncuk.auth.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.aksiyoncuk.auth.entity.RefreshToken;
import com.aksiyoncuk.auth.exception.AuthException;
import com.aksiyoncuk.user.entity.User;
import com.aksiyoncuk.user.entity.UserStatus;
import com.aksiyoncuk.user.repository.UserRepository;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class AuthenticationServiceTest {

  @Mock private UserRepository userRepository;
  @Mock private PasswordEncoder passwordEncoder;
  @Mock private JwtTokenService jwtTokenService;
  @Mock private RefreshTokenService refreshTokenService;
  @Mock private User user;
  @Mock private RefreshToken refreshTokenEntity;

  private AuthenticationService service;
  private final TokenContext context = new TokenContext("test", "127.0.0.1");

  @BeforeEach
  void setUp() {
    service =
        new AuthenticationService(
            userRepository, passwordEncoder, jwtTokenService, refreshTokenService);
  }

  @Test
  void logsInWithNormalizedEmailAndMatchesBcryptPassword() {
    prepareSuccess(" User@Example.com ");

    var response = service.login(" User@Example.com ", "Password123!", context);

    verify(userRepository).findByEmailOrUsername("user@example.com", "user@example.com");
    verify(passwordEncoder).matches("Password123!", "$2a$hash");
    assertThat(response.accessToken()).isEqualTo("access");
  }

  @Test
  void logsInWithNormalizedUsername() {
    prepareSuccess(" CreativeUser ");

    service.login(" CreativeUser ", "Password123!", context);

    verify(userRepository).findByEmailOrUsername("creativeuser", "creativeuser");
  }

  @Test
  void wrongPasswordReturnsGenericInvalidCredentials() {
    when(userRepository.findByEmailOrUsername("user@example.com", "user@example.com"))
        .thenReturn(Optional.of(user));
    when(user.getPasswordHash()).thenReturn("$2a$hash");
    when(passwordEncoder.matches("wrong", "$2a$hash")).thenReturn(false);

    assertCode(() -> service.login("user@example.com", "wrong", context), "INVALID_CREDENTIALS");
  }

  @Test
  void unknownUserReturnsSameGenericInvalidCredentials() {
    when(userRepository.findByEmailOrUsername("missing", "missing")).thenReturn(Optional.empty());

    assertCode(() -> service.login("missing", "Password123!", context), "INVALID_CREDENTIALS");
  }

  @Test
  void inactiveUserIsRejected() {
    when(userRepository.findByEmailOrUsername("inactive", "inactive"))
        .thenReturn(Optional.of(user));
    when(user.getPasswordHash()).thenReturn("$2a$hash");
    when(passwordEncoder.matches("Password123!", "$2a$hash")).thenReturn(true);
    when(user.getStatus()).thenReturn(null);

    assertCode(() -> service.login("inactive", "Password123!", context), "INACTIVE_USER");
  }

  @Test
  void responseNeverContainsPasswordHash() {
    prepareSuccess("user@example.com");

    var response = service.login("user@example.com", "Password123!", context);

    assertThat(response.toString())
        .doesNotContain("$2a$hash")
        .doesNotContainIgnoringCase("password");
  }

  private void prepareSuccess(String identifier) {
    var normalized = identifier.trim().toLowerCase(java.util.Locale.ROOT);
    when(userRepository.findByEmailOrUsername(normalized, normalized))
        .thenReturn(Optional.of(user));
    when(user.getId()).thenReturn(UUID.randomUUID());
    when(user.getEmail()).thenReturn("user@example.com");
    when(user.getUsername()).thenReturn("creativeuser");
    when(user.getFullName()).thenReturn("Creative User");
    when(user.getStatus()).thenReturn(UserStatus.ACTIVE);
    when(user.getPasswordHash()).thenReturn("$2a$hash");
    when(passwordEncoder.matches("Password123!", "$2a$hash")).thenReturn(true);
    when(jwtTokenService.createAccessToken(user))
        .thenReturn(new AccessToken("access", Instant.now().plusSeconds(900)));
    when(refreshTokenService.issue(user, context))
        .thenReturn(
            new IssuedRefreshToken("refresh", Instant.now().plusSeconds(3600), refreshTokenEntity));
  }

  private void assertCode(org.assertj.core.api.ThrowableAssert.ThrowingCallable call, String code) {
    assertThatThrownBy(call)
        .isInstanceOfSatisfying(
            AuthException.class, exception -> assertThat(exception.getCode()).isEqualTo(code));
  }
}

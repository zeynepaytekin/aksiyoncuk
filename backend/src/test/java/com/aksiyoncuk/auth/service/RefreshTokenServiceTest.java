package com.aksiyoncuk.auth.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.aksiyoncuk.auth.config.JwtProperties;
import com.aksiyoncuk.auth.entity.RefreshToken;
import com.aksiyoncuk.auth.exception.AuthException;
import com.aksiyoncuk.auth.exception.ReusedRefreshTokenException;
import com.aksiyoncuk.auth.repository.RefreshTokenRepository;
import com.aksiyoncuk.user.entity.User;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class RefreshTokenServiceTest {

  @Mock private RefreshTokenRepository repository;
  @Mock private User user;

  private RefreshTokenService service;
  private final TokenContext context = new TokenContext("test", "127.0.0.1");

  @BeforeEach
  void setUp() {
    service =
        new RefreshTokenService(
            repository, new JwtProperties("unit-test-secret-with-at-least-32-bytes", 900, 2592000));
    org.mockito.Mockito.lenient()
        .when(repository.saveAndFlush(any(RefreshToken.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));
  }

  @Test
  void storesOnlyHashWhenIssuingToken() {
    var issued = service.issue(user, context);

    assertThat(issued.entity().getTokenHash()).hasSize(64).isNotEqualTo(issued.value());
    assertThat(service.hash(issued.value())).isEqualTo(issued.entity().getTokenHash());
  }

  @Test
  void rotatesActiveRefreshToken() {
    var existing =
        new RefreshToken(user, service.hash("old"), Instant.now().plusSeconds(300), null, null);
    when(repository.findByTokenHash(service.hash("old"))).thenReturn(Optional.of(existing));

    var replacement = service.rotate("old", context);

    assertThat(existing.getRevokedAt()).isNotNull();
    assertThat(existing.getReplacedByToken()).isSameAs(replacement.entity());
  }

  @Test
  void rejectsExpiredRefreshToken() {
    var existing =
        new RefreshToken(user, service.hash("old"), Instant.now().minusSeconds(1), null, null);
    when(repository.findByTokenHash(service.hash("old"))).thenReturn(Optional.of(existing));

    assertCode(() -> service.rotate("old", context), "EXPIRED_REFRESH_TOKEN");
  }

  @Test
  void rejectsRevokedRefreshToken() {
    var existing =
        new RefreshToken(user, service.hash("old"), Instant.now().plusSeconds(300), null, null);
    existing.revoke(Instant.now());
    when(repository.findByTokenHash(service.hash("old"))).thenReturn(Optional.of(existing));

    assertCode(() -> service.rotate("old", context), "INVALID_REFRESH_TOKEN");
  }

  @Test
  void detectsReuseAndRevokesActiveTokens() {
    var userId = UUID.randomUUID();
    var existing =
        new RefreshToken(user, service.hash("old"), Instant.now().plusSeconds(300), null, null);
    var replacement =
        new RefreshToken(user, service.hash("new"), Instant.now().plusSeconds(300), null, null);
    existing.rotateTo(replacement, Instant.now());
    when(user.getId()).thenReturn(userId);
    when(repository.findByTokenHash(service.hash("old"))).thenReturn(Optional.of(existing));
    when(repository.findAllByUserIdAndRevokedAtIsNullAndExpiresAtAfter(
            org.mockito.ArgumentMatchers.eq(userId), any(Instant.class)))
        .thenReturn(List.of(replacement));

    assertThatThrownBy(() -> service.rotate("old", context))
        .isInstanceOf(ReusedRefreshTokenException.class);
    assertThat(replacement.getRevokedAt()).isNotNull();
  }

  @Test
  void logoutIsIdempotentForUnknownToken() {
    when(repository.findByTokenHash(service.hash("missing"))).thenReturn(Optional.empty());

    service.logout("missing");
    service.logout("missing");

    verify(repository, org.mockito.Mockito.times(2)).findByTokenHash(service.hash("missing"));
  }

  private void assertCode(org.assertj.core.api.ThrowableAssert.ThrowingCallable call, String code) {
    assertThatThrownBy(call)
        .isInstanceOfSatisfying(
            AuthException.class, exception -> assertThat(exception.getCode()).isEqualTo(code));
  }
}

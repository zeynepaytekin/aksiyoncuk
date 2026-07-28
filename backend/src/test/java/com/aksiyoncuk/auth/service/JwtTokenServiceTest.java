package com.aksiyoncuk.auth.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.aksiyoncuk.auth.config.JwtProperties;
import com.aksiyoncuk.auth.exception.AuthException;
import com.aksiyoncuk.user.entity.User;
import io.jsonwebtoken.Jwts;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

class JwtTokenServiceTest {

  private static final String SECRET = "unit-test-secret-with-at-least-32-bytes";

  @Test
  void createsAndValidatesAccessTokenWithUserSubject() {
    var userId = UUID.randomUUID();
    var user = Mockito.mock(User.class);
    Mockito.when(user.getId()).thenReturn(userId);
    var service = new JwtTokenService(new JwtProperties(SECRET, 900, 2592000));

    var token = service.createAccessToken(user);

    assertThat(service.validateAccessToken(token.value())).isEqualTo(userId);
    assertThat(token.expiresAt()).isAfter(java.time.Instant.now());
  }

  @Test
  void rejectsTokenWithWrongSignature() {
    var service = new JwtTokenService(new JwtProperties(SECRET, 900, 2592000));
    var otherKey =
        io.jsonwebtoken.security.Keys.hmacShaKeyFor(
            "different-unit-test-secret-at-least-32-bytes".getBytes(StandardCharsets.UTF_8));
    var token =
        Jwts.builder()
            .subject(UUID.randomUUID().toString())
            .issuer(JwtTokenService.ISSUER)
            .audience()
            .add(JwtTokenService.AUDIENCE)
            .and()
            .claim("token_type", "access")
            .signWith(otherKey)
            .compact();

    assertThatThrownBy(() -> service.validateAccessToken(token))
        .isInstanceOfSatisfying(
            AuthException.class,
            exception -> assertThat(exception.getCode()).isEqualTo("INVALID_ACCESS_TOKEN"));
  }

  @Test
  void rejectsWeakSecretAtStartup() {
    assertThatThrownBy(() -> new JwtTokenService(new JwtProperties("too-short", 900, 2592000)))
        .isInstanceOf(IllegalStateException.class);
  }
}

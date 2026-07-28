package com.aksiyoncuk.auth.service;

import com.aksiyoncuk.auth.config.JwtProperties;
import com.aksiyoncuk.auth.entity.RefreshToken;
import com.aksiyoncuk.auth.exception.AuthException;
import com.aksiyoncuk.auth.exception.ReusedRefreshTokenException;
import com.aksiyoncuk.auth.repository.RefreshTokenRepository;
import com.aksiyoncuk.user.entity.User;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RefreshTokenService {

  private static final int TOKEN_BYTES = 32;

  private final RefreshTokenRepository repository;
  private final JwtProperties properties;
  private final SecureRandom secureRandom = new SecureRandom();

  public RefreshTokenService(RefreshTokenRepository repository, JwtProperties properties) {
    this.repository = repository;
    this.properties = properties;
  }

  @Transactional
  public IssuedRefreshToken issue(User user, TokenContext context) {
    var rawToken = randomToken();
    var expiresAt = Instant.now().plusSeconds(properties.refreshExpirationSeconds());
    var entity =
        repository.saveAndFlush(
            new RefreshToken(
                user, hash(rawToken), expiresAt, context.userAgent(), context.ipAddress()));
    return new IssuedRefreshToken(rawToken, expiresAt, entity);
  }

  @Transactional(noRollbackFor = ReusedRefreshTokenException.class)
  public IssuedRefreshToken rotate(String rawToken, TokenContext context) {
    var existing =
        repository
            .findByTokenHash(hash(rawToken))
            .orElseThrow(
                () -> new AuthException("INVALID_REFRESH_TOKEN", "Refresh token is invalid"));
    var now = Instant.now();

    if (existing.getRevokedAt() != null) {
      if (existing.getReplacedByToken() != null) {
        revokeAllActive(existing.getUser(), now);
        throw new ReusedRefreshTokenException();
      }
      throw new AuthException("INVALID_REFRESH_TOKEN", "Refresh token is invalid");
    }
    if (!existing.getExpiresAt().isAfter(now)) {
      existing.revoke(now);
      throw new AuthException("EXPIRED_REFRESH_TOKEN", "Refresh token has expired");
    }

    var replacement = issue(existing.getUser(), context);
    existing.rotateTo(replacement.entity(), now);
    repository.save(existing);
    return replacement;
  }

  @Transactional
  public void logout(String rawToken) {
    repository.findByTokenHash(hash(rawToken)).ifPresent(token -> token.revoke(Instant.now()));
  }

  public String hash(String rawToken) {
    try {
      var digest = MessageDigest.getInstance("SHA-256");
      return HexFormat.of().formatHex(digest.digest(rawToken.getBytes(StandardCharsets.UTF_8)));
    } catch (NoSuchAlgorithmException exception) {
      throw new IllegalStateException("SHA-256 is unavailable", exception);
    }
  }

  private String randomToken() {
    var bytes = new byte[TOKEN_BYTES];
    secureRandom.nextBytes(bytes);
    return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
  }

  private void revokeAllActive(User user, Instant now) {
    var active = repository.findAllByUserIdAndRevokedAtIsNullAndExpiresAtAfter(user.getId(), now);
    active.forEach(token -> token.revoke(now));
    repository.saveAll(active);
  }
}

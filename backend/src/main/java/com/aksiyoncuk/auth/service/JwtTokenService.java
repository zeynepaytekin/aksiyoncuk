package com.aksiyoncuk.auth.service;

import com.aksiyoncuk.auth.config.JwtProperties;
import com.aksiyoncuk.auth.exception.AuthException;
import com.aksiyoncuk.user.entity.User;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;
import javax.crypto.SecretKey;
import org.springframework.stereotype.Service;

@Service
public class JwtTokenService {

  public static final String ISSUER = "aksiyoncuk-api";
  public static final String AUDIENCE = "aksiyoncuk-clients";
  private static final String TOKEN_TYPE_CLAIM = "token_type";
  private static final String ACCESS_TOKEN_TYPE = "access";

  private final JwtProperties properties;
  private final SecretKey signingKey;

  public JwtTokenService(JwtProperties properties) {
    this.properties = properties;
    var secretBytes = properties.accessSecret().getBytes(StandardCharsets.UTF_8);
    if (secretBytes.length < 32) {
      throw new IllegalStateException("JWT access secret must contain at least 32 bytes");
    }
    signingKey = Keys.hmacShaKeyFor(secretBytes);
  }

  public AccessToken createAccessToken(User user) {
    var issuedAt = Instant.now();
    var expiresAt = issuedAt.plusSeconds(properties.accessExpirationSeconds());
    var value =
        Jwts.builder()
            .issuer(ISSUER)
            .audience()
            .add(AUDIENCE)
            .and()
            .subject(user.getId().toString())
            .id(UUID.randomUUID().toString())
            .issuedAt(Date.from(issuedAt))
            .notBefore(Date.from(issuedAt))
            .expiration(Date.from(expiresAt))
            .claim(TOKEN_TYPE_CLAIM, ACCESS_TOKEN_TYPE)
            .signWith(signingKey, Jwts.SIG.HS256)
            .compact();
    return new AccessToken(value, expiresAt);
  }

  public UUID validateAccessToken(String token) {
    try {
      var claims =
          Jwts.parser()
              .verifyWith(signingKey)
              .requireIssuer(ISSUER)
              .requireAudience(AUDIENCE)
              .require(TOKEN_TYPE_CLAIM, ACCESS_TOKEN_TYPE)
              .build()
              .parseSignedClaims(token)
              .getPayload();
      return UUID.fromString(claims.getSubject());
    } catch (ExpiredJwtException exception) {
      throw new AuthException("EXPIRED_ACCESS_TOKEN", "Access token has expired");
    } catch (JwtException | IllegalArgumentException exception) {
      throw new AuthException("INVALID_ACCESS_TOKEN", "Access token is invalid");
    }
  }
}

package com.aksiyoncuk.auth.service;

import com.aksiyoncuk.auth.dto.AuthResponse;
import com.aksiyoncuk.auth.dto.AuthUserResponse;
import com.aksiyoncuk.auth.exception.AuthException;
import com.aksiyoncuk.auth.exception.ReusedRefreshTokenException;
import com.aksiyoncuk.auth.security.AuthenticatedUser;
import com.aksiyoncuk.user.entity.User;
import com.aksiyoncuk.user.entity.UserStatus;
import com.aksiyoncuk.user.repository.UserRepository;
import java.util.Locale;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthenticationService {

  private final UserRepository userRepository;
  private final PasswordEncoder passwordEncoder;
  private final JwtTokenService jwtTokenService;
  private final RefreshTokenService refreshTokenService;

  public AuthenticationService(
      UserRepository userRepository,
      PasswordEncoder passwordEncoder,
      JwtTokenService jwtTokenService,
      RefreshTokenService refreshTokenService) {
    this.userRepository = userRepository;
    this.passwordEncoder = passwordEncoder;
    this.jwtTokenService = jwtTokenService;
    this.refreshTokenService = refreshTokenService;
  }

  @Transactional
  public AuthResponse login(String identifier, String password, TokenContext context) {
    var normalized = identifier.trim().toLowerCase(Locale.ROOT);
    var user =
        userRepository
            .findByEmailOrUsername(normalized, normalized)
            .orElseThrow(this::invalidCredentials);
    if (!passwordEncoder.matches(password, user.getPasswordHash())) {
      throw invalidCredentials();
    }
    ensureActive(user);
    return issueSession(user, refreshTokenService.issue(user, context));
  }

  @Transactional(noRollbackFor = ReusedRefreshTokenException.class)
  public AuthResponse refresh(String rawToken, TokenContext context) {
    var refreshToken = refreshTokenService.rotate(rawToken, context);
    var user = refreshToken.entity().getUser();
    ensureActive(user);
    return issueSession(user, refreshToken);
  }

  public void logout(String rawToken) {
    refreshTokenService.logout(rawToken);
  }

  @Transactional(readOnly = true)
  public AuthUserResponse currentUser(AuthenticatedUser principal) {
    var user =
        userRepository
            .findById(principal.userId())
            .orElseThrow(
                () -> new AuthException("INVALID_ACCESS_TOKEN", "Access token is invalid"));
    ensureActive(user);
    return AuthUserResponse.from(user);
  }

  private AuthResponse issueSession(User user, IssuedRefreshToken refreshToken) {
    var accessToken = jwtTokenService.createAccessToken(user);
    return new AuthResponse(
        accessToken.value(),
        accessToken.expiresAt(),
        refreshToken.value(),
        refreshToken.expiresAt(),
        "Bearer",
        AuthUserResponse.from(user));
  }

  private void ensureActive(User user) {
    if (user.getStatus() != UserStatus.ACTIVE) {
      throw new AuthException("INACTIVE_USER", "User account is inactive");
    }
  }

  private AuthException invalidCredentials() {
    return new AuthException("INVALID_CREDENTIALS", "Invalid identifier or password");
  }
}

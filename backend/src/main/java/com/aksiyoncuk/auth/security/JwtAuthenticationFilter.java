package com.aksiyoncuk.auth.security;

import com.aksiyoncuk.auth.exception.AuthException;
import com.aksiyoncuk.auth.service.JwtTokenService;
import com.aksiyoncuk.user.entity.UserStatus;
import com.aksiyoncuk.user.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

  private static final String BEARER_PREFIX = "Bearer ";

  private final JwtTokenService jwtTokenService;
  private final UserRepository userRepository;
  private final SecurityErrorWriter errorWriter;

  public JwtAuthenticationFilter(
      JwtTokenService jwtTokenService,
      UserRepository userRepository,
      SecurityErrorWriter errorWriter) {
    this.jwtTokenService = jwtTokenService;
    this.userRepository = userRepository;
    this.errorWriter = errorWriter;
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
      throws ServletException, IOException {
    var authorization = request.getHeader(HttpHeaders.AUTHORIZATION);
    if (authorization == null) {
      filterChain.doFilter(request, response);
      return;
    }
    if (!authorization.startsWith(BEARER_PREFIX)
        || authorization.length() == BEARER_PREFIX.length()) {
      errorWriter.write(
          request,
          response,
          401,
          "Unauthorized",
          "INVALID_ACCESS_TOKEN",
          "Access token is invalid");
      return;
    }

    try {
      var userId = jwtTokenService.validateAccessToken(authorization.substring(7));
      var user =
          userRepository
              .findById(userId)
              .orElseThrow(
                  () -> new AuthException("INVALID_ACCESS_TOKEN", "Access token is invalid"));
      if (user.getStatus() != UserStatus.ACTIVE) {
        throw new AuthException("INACTIVE_USER", "User account is inactive");
      }
      var principal = new AuthenticatedUser(userId);
      var authentication = new UsernamePasswordAuthenticationToken(principal, null, List.of());
      SecurityContextHolder.getContext().setAuthentication(authentication);
      filterChain.doFilter(request, response);
    } catch (AuthException exception) {
      SecurityContextHolder.clearContext();
      errorWriter.write(
          request, response, 401, "Unauthorized", exception.getCode(), exception.getMessage());
    }
  }
}

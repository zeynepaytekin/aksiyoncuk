package com.aksiyoncuk.common.config;

import com.aksiyoncuk.auth.config.JwtProperties;
import com.aksiyoncuk.auth.security.JsonAccessDeniedHandler;
import com.aksiyoncuk.auth.security.JsonAuthenticationEntryPoint;
import com.aksiyoncuk.auth.security.JwtAuthenticationFilter;
import java.util.List;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableConfigurationProperties({CorsProperties.class, JwtProperties.class})
public class SecurityConfig {

  @Bean
  SecurityFilterChain securityFilterChain(
      HttpSecurity http,
      JwtAuthenticationFilter jwtAuthenticationFilter,
      JsonAuthenticationEntryPoint authenticationEntryPoint,
      JsonAccessDeniedHandler accessDeniedHandler)
      throws Exception {
    return http.csrf(csrf -> csrf.disable())
        .cors(Customizer.withDefaults())
        .sessionManagement(
            session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .formLogin(form -> form.disable())
        .httpBasic(basic -> basic.disable())
        .exceptionHandling(
            exceptions ->
                exceptions
                    .authenticationEntryPoint(authenticationEntryPoint)
                    .accessDeniedHandler(accessDeniedHandler))
        .authorizeHttpRequests(
            authorize ->
                authorize
                    .requestMatchers(
                        HttpMethod.POST,
                        "/api/v1/auth/register",
                        "/api/v1/auth/login",
                        "/api/v1/auth/refresh",
                        "/api/v1/auth/logout")
                    .permitAll()
                    .requestMatchers(
                        HttpMethod.GET,
                        "/api/v1/health",
                        "/actuator/health",
                        "/v3/api-docs/**",
                        "/swagger-ui/**",
                        "/swagger-ui.html")
                    .permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/v1/search", "/api/v1/search/**")
                    .permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/v1/profiles/me")
                    .authenticated()
                    .requestMatchers(HttpMethod.PATCH, "/api/v1/profiles/me")
                    .authenticated()
                    .requestMatchers(HttpMethod.GET, "/api/v1/profiles/{username}")
                    .permitAll()
                    .requestMatchers(HttpMethod.PUT, "/api/v1/users/{username}/follow")
                    .authenticated()
                    .requestMatchers(HttpMethod.DELETE, "/api/v1/users/{username}/follow")
                    .authenticated()
                    .requestMatchers(
                        HttpMethod.GET,
                        "/api/v1/users/{username}/followers",
                        "/api/v1/users/{username}/following")
                    .permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/v1/network/me")
                    .authenticated()
                    .requestMatchers(
                        HttpMethod.GET, "/api/v1/notifications/summary", "/api/v1/notifications")
                    .authenticated()
                    .requestMatchers(HttpMethod.POST, "/api/v1/notifications/read-all")
                    .authenticated()
                    .requestMatchers(
                        HttpMethod.POST,
                        "/api/v1/notifications/{notificationId}/read",
                        "/api/v1/notifications/{notificationId}/unread")
                    .authenticated()
                    .requestMatchers(HttpMethod.GET, "/api/v1/posts/me")
                    .authenticated()
                    .requestMatchers(HttpMethod.GET, "/api/v1/posts/{postId}/comments")
                    .permitAll()
                    .requestMatchers(HttpMethod.POST, "/api/v1/posts/{postId}/comments")
                    .authenticated()
                    .requestMatchers(HttpMethod.DELETE, "/api/v1/comments/{commentId}")
                    .authenticated()
                    .requestMatchers(HttpMethod.PUT, "/api/v1/posts/{postId}/like")
                    .authenticated()
                    .requestMatchers(HttpMethod.DELETE, "/api/v1/posts/{postId}/like")
                    .authenticated()
                    .requestMatchers(HttpMethod.GET, "/api/v1/posts")
                    .permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/v1/posts/{postId}")
                    .permitAll()
                    .requestMatchers(HttpMethod.POST, "/api/v1/posts")
                    .authenticated()
                    .requestMatchers(HttpMethod.DELETE, "/api/v1/posts/{postId}")
                    .authenticated()
                    .requestMatchers(HttpMethod.GET, "/api/v1/works/me")
                    .authenticated()
                    .requestMatchers(HttpMethod.GET, "/api/v1/users/{username}/works")
                    .permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/v1/works/{workId}")
                    .permitAll()
                    .requestMatchers(HttpMethod.POST, "/api/v1/works")
                    .authenticated()
                    .requestMatchers(HttpMethod.PATCH, "/api/v1/works/{workId}")
                    .authenticated()
                    .requestMatchers(HttpMethod.DELETE, "/api/v1/works/{workId}")
                    .authenticated()
                    .requestMatchers(HttpMethod.GET, "/api/v1/jobs/me")
                    .authenticated()
                    .requestMatchers(HttpMethod.GET, "/api/v1/job-applications/me")
                    .authenticated()
                    .requestMatchers(
                        HttpMethod.POST,
                        "/api/v1/job-applications/{applicationId}/withdraw",
                        "/api/v1/job-applications/{applicationId}/accept",
                        "/api/v1/job-applications/{applicationId}/reject")
                    .authenticated()
                    .requestMatchers(HttpMethod.GET, "/api/v1/job-applications/{applicationId}")
                    .authenticated()
                    .requestMatchers(HttpMethod.GET, "/api/v1/jobs/{jobId}/applications")
                    .authenticated()
                    .requestMatchers(HttpMethod.POST, "/api/v1/jobs/{jobId}/applications")
                    .authenticated()
                    .requestMatchers(HttpMethod.GET, "/api/v1/jobs")
                    .permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/v1/jobs/{jobId}")
                    .permitAll()
                    .requestMatchers(HttpMethod.POST, "/api/v1/jobs")
                    .authenticated()
                    .requestMatchers(
                        HttpMethod.POST,
                        "/api/v1/jobs/{jobId}/close",
                        "/api/v1/jobs/{jobId}/reopen")
                    .authenticated()
                    .requestMatchers(HttpMethod.PATCH, "/api/v1/jobs/{jobId}")
                    .authenticated()
                    .requestMatchers(HttpMethod.DELETE, "/api/v1/jobs/{jobId}")
                    .authenticated()
                    .anyRequest()
                    .authenticated())
        .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
        .build();
  }

  @Bean
  PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
  }

  @Bean
  CorsConfigurationSource corsConfigurationSource(CorsProperties properties) {
    var configuration = new CorsConfiguration();
    configuration.setAllowedOrigins(properties.allowedOrigins());
    configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
    configuration.setAllowedHeaders(List.of("*"));
    configuration.setAllowCredentials(true);
    configuration.setMaxAge(3600L);

    var source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/api/**", configuration);
    return source;
  }
}

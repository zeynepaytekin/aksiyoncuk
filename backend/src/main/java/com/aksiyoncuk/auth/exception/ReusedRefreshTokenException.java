package com.aksiyoncuk.auth.exception;

public class ReusedRefreshTokenException extends AuthException {

  public ReusedRefreshTokenException() {
    super("REUSED_REFRESH_TOKEN", "Refresh token reuse was detected");
  }
}

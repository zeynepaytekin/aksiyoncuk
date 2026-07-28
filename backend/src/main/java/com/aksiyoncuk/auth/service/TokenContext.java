package com.aksiyoncuk.auth.service;

public record TokenContext(String userAgent, String ipAddress) {

  public TokenContext {
    userAgent = limit(userAgent, 512);
    ipAddress = limit(ipAddress, 45);
  }

  private static String limit(String value, int maximum) {
    if (value == null || value.isBlank()) {
      return null;
    }
    return value.length() <= maximum ? value : value.substring(0, maximum);
  }
}

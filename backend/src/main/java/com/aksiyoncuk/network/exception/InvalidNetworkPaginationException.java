package com.aksiyoncuk.network.exception;

import org.springframework.http.HttpStatus;

public final class InvalidNetworkPaginationException extends NetworkException {
  public InvalidNetworkPaginationException() {
    super(
        HttpStatus.BAD_REQUEST,
        "INVALID_NETWORK_PAGINATION",
        "Page must be at least 0 and size must be between 1 and 50");
  }
}

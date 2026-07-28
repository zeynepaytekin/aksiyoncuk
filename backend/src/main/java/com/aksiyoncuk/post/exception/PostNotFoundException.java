package com.aksiyoncuk.post.exception;

import org.springframework.http.HttpStatus;

public final class PostNotFoundException extends PostException {
  public PostNotFoundException() {
    super("POST_NOT_FOUND", "Post was not found", HttpStatus.NOT_FOUND);
  }
}

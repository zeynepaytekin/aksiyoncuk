package com.aksiyoncuk.post.exception;

import org.springframework.http.HttpStatus;

public final class PostDeleteForbiddenException extends PostException {
  public PostDeleteForbiddenException() {
    super(
        "POST_DELETE_FORBIDDEN", "Only the post owner may delete this post", HttpStatus.FORBIDDEN);
  }
}

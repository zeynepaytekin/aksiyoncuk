package com.aksiyoncuk.post.comment.exception;

import org.springframework.http.HttpStatus;

public final class CommentNotFoundException extends CommentException {
  public CommentNotFoundException() {
    super("COMMENT_NOT_FOUND", "Comment was not found", HttpStatus.NOT_FOUND);
  }
}

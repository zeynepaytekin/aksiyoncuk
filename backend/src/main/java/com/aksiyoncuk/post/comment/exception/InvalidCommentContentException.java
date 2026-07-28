package com.aksiyoncuk.post.comment.exception;

import org.springframework.http.HttpStatus;

public final class InvalidCommentContentException extends CommentException {
  public InvalidCommentContentException(String message) {
    super("INVALID_COMMENT_CONTENT", message, HttpStatus.BAD_REQUEST);
  }
}

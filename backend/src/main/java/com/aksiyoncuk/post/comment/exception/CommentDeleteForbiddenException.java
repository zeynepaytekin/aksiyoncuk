package com.aksiyoncuk.post.comment.exception;

import org.springframework.http.HttpStatus;

public final class CommentDeleteForbiddenException extends CommentException {
  public CommentDeleteForbiddenException() {
    super(
        "COMMENT_DELETE_FORBIDDEN",
        "Only the comment owner may delete this comment",
        HttpStatus.FORBIDDEN);
  }
}

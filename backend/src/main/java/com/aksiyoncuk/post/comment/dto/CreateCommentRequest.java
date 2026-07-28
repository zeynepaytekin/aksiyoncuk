package com.aksiyoncuk.post.comment.dto;

import io.swagger.v3.oas.annotations.media.Schema;

public record CreateCommentRequest(@Schema(example = "Great project.") String content) {}

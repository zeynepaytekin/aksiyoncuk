package com.aksiyoncuk.post.like.dto;

import java.util.UUID;

public record PostLikeResponse(UUID postId, boolean likedByCurrentUser, long likeCount) {}

package com.aksiyoncuk.search.dto;

import com.aksiyoncuk.job.dto.JobResponse;
import com.aksiyoncuk.post.dto.PostResponse;
import com.aksiyoncuk.work.dto.WorkResponse;

public record CombinedSearchResponse(
    String query,
    SearchGroupResponse<SearchUserResponse> users,
    SearchGroupResponse<PostResponse> posts,
    SearchGroupResponse<WorkResponse> works,
    SearchGroupResponse<JobResponse> jobs) {}

package com.aksiyoncuk.search.dto;

import java.util.List;

public record SearchGroupResponse<T>(List<T> content, long totalElements) {}

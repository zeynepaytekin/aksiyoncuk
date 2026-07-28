package com.aksiyoncuk.search.dto;

import java.util.List;
import org.springframework.data.domain.Page;

public record SearchPageResponse<T>(
    List<T> content,
    int page,
    int size,
    long totalElements,
    int totalPages,
    boolean first,
    boolean last) {

  public static <S, T> SearchPageResponse<T> from(
      Page<S> source, java.util.function.Function<S, T> mapper) {
    return new SearchPageResponse<>(
        source.getContent().stream().map(mapper).toList(),
        source.getNumber(),
        source.getSize(),
        source.getTotalElements(),
        source.getTotalPages(),
        source.isFirst(),
        source.isLast());
  }
}

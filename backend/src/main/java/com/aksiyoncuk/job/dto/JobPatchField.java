package com.aksiyoncuk.job.dto;

public record JobPatchField<T>(boolean present, T value) {
  public static <T> JobPatchField<T> missing() {
    return new JobPatchField<>(false, null);
  }

  public static <T> JobPatchField<T> supplied(T value) {
    return new JobPatchField<>(true, value);
  }
}

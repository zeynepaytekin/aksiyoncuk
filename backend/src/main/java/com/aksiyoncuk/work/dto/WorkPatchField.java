package com.aksiyoncuk.work.dto;

public record WorkPatchField<T>(boolean present, T value) {

  public static <T> WorkPatchField<T> missing() {
    return new WorkPatchField<>(false, null);
  }

  public static <T> WorkPatchField<T> supplied(T value) {
    return new WorkPatchField<>(true, value);
  }
}

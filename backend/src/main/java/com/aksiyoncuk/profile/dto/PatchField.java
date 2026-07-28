package com.aksiyoncuk.profile.dto;

public record PatchField(boolean present, String value) {

  public static PatchField missing() {
    return new PatchField(false, null);
  }

  public static PatchField supplied(String value) {
    return new PatchField(true, value);
  }
}

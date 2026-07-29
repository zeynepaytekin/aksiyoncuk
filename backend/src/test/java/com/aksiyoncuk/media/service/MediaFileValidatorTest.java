package com.aksiyoncuk.media.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.aksiyoncuk.media.exception.MediaException;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

class MediaFileValidatorTest {
  private final MediaFileValidator validator = new MediaFileValidator();

  @Test
  void acceptsSupportedSignaturesAndSanitizesFilename() {
    var jpeg =
        validator.validate(
            new MockMultipartFile(
                "file", "../unsafe name.jpg", "image/jpeg", new byte[] {-1, -40, -1, 1}),
            100);
    var png =
        validator.validate(
            new MockMultipartFile(
                "file", "image.png", "image/png", new byte[] {-119, 80, 78, 71, 13, 10, 26, 10}),
            100);
    var webp =
        validator.validate(
            new MockMultipartFile(
                "file",
                "image.webp",
                "image/webp",
                new byte[] {'R', 'I', 'F', 'F', 0, 0, 0, 0, 'W', 'E', 'B', 'P'}),
            100);

    assertThat(jpeg.filename()).isEqualTo("unsafe_name.jpg");
    assertThat(png.contentType()).isEqualTo("image/png");
    assertThat(webp.extension()).isEqualTo("webp");
  }

  @Test
  void rejectsEmptyOversizedAndUnsupportedFiles() {
    assertCode(
        new MockMultipartFile("file", "empty.png", "image/png", new byte[0]),
        100,
        "MEDIA_FILE_EMPTY");
    assertCode(
        new MockMultipartFile("file", "large.jpg", "image/jpeg", new byte[] {-1, -40, -1, 1}),
        3,
        "MEDIA_FILE_TOO_LARGE");
    assertCode(
        new MockMultipartFile(
            "file",
            "image.svg",
            "image/svg+xml",
            "<svg/>".getBytes(java.nio.charset.StandardCharsets.UTF_8)),
        100,
        "MEDIA_TYPE_NOT_ALLOWED");
    assertCode(
        new MockMultipartFile(
            "file",
            "page.html",
            "text/html",
            "<html/>".getBytes(java.nio.charset.StandardCharsets.UTF_8)),
        100,
        "MEDIA_TYPE_NOT_ALLOWED");
    assertCode(
        new MockMultipartFile("file", "app.exe", "application/octet-stream", new byte[] {'M', 'Z'}),
        100,
        "MEDIA_TYPE_NOT_ALLOWED");
  }

  @Test
  void rejectsMimeAndSignatureMismatch() {
    assertCode(
        new MockMultipartFile(
            "file", "wrong.jpg", "image/jpeg", new byte[] {-119, 80, 78, 71, 13, 10, 26, 10}),
        100,
        "MEDIA_CONTENT_TYPE_MISMATCH");
  }

  private void assertCode(MockMultipartFile file, long maximum, String code) {
    assertThatThrownBy(() -> validator.validate(file, maximum))
        .isInstanceOf(MediaException.class)
        .extracting("code")
        .isEqualTo(code);
  }
}

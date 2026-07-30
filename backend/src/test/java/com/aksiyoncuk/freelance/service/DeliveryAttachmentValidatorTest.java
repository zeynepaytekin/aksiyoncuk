package com.aksiyoncuk.freelance.service;

import static org.assertj.core.api.Assertions.*;

import com.aksiyoncuk.freelance.exception.FreelanceException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

class DeliveryAttachmentValidatorTest {
  private final DeliveryAttachmentValidator validator = new DeliveryAttachmentValidator();

  @Test
  void acceptsSupportedBinaryAndTextFiles() {
    List<MultipartFile> files =
        List.of(
            file("photo.jpg", "image/jpeg", bytes(0xff, 0xd8, 0xff)),
            file("proof.png", "image/png", bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)),
            file("preview.webp", "image/webp", "RIFFxxxxWEBP".getBytes(StandardCharsets.US_ASCII)),
            file("brief.pdf", "application/pdf", "%PDF-1.7".getBytes(StandardCharsets.US_ASCII)),
            file("source.zip", "application/zip", bytes(0x50, 0x4b, 0x03, 0x04)));
    assertThat(validator.validate(files)).hasSize(5);
    assertThat(
            validator.validate(
                List.of(
                    file(
                        "notes.txt",
                        "text/plain",
                        "Türkçe teslim".getBytes(StandardCharsets.UTF_8)))))
        .hasSize(1);
  }

  @Test
  void rejectsEmptyUnsupportedAndMismatchedFiles() {
    assertThatThrownBy(
            () ->
                validator.validate(
                    List.of(
                        new MockMultipartFile("files", "empty.txt", "text/plain", new byte[0]))))
        .isInstanceOf(FreelanceException.class);
    assertThatThrownBy(
            () ->
                validator.validate(
                    List.of(
                        new MockMultipartFile(
                            "files", "payload.exe", "application/octet-stream", new byte[] {1}))))
        .isInstanceOf(FreelanceException.class);
    assertThatThrownBy(
            () ->
                validator.validate(
                    List.of(
                        new MockMultipartFile(
                            "files", "fake.pdf", "application/pdf", "not pdf".getBytes()))))
        .isInstanceOf(FreelanceException.class);
  }

  @Test
  void enforcesAttachmentCount() {
    var text = new MockMultipartFile("files", "a.txt", "text/plain", new byte[] {1});
    assertThatThrownBy(() -> validator.validate(List.of(text, text, text, text, text, text)))
        .isInstanceOf(FreelanceException.class);
  }

  @Test
  void rejectsEveryMalformedSignatureAndBinaryText() {
    for (var file :
        List.of(
            file("fake.jpg", "image/jpeg", "fake".getBytes()),
            file("fake.png", "image/png", "fake".getBytes()),
            file("fake.pdf", "application/pdf", "fake".getBytes()),
            file("fake.zip", "application/zip", "fake".getBytes()),
            file("invalid.txt", "text/plain", bytes(0xc3, 0x28)),
            file("binary.txt", "text/plain", bytes(0x41, 0x00, 0x42)))) {
      assertThatThrownBy(() -> validator.validate(List.of(file)))
          .isInstanceOfSatisfying(
              FreelanceException.class,
              error ->
                  assertThat(error.getCode()).isEqualTo("FREELANCE_ATTACHMENT_CONTENT_MISMATCH"));
    }
  }

  @Test
  void normalizesPathsAndUnicodeButRejectsInvalidAndLongNames() {
    var windows =
        validator
            .validate(List.of(file("..\\private\\proof.txt", "text/plain", "ok".getBytes())))
            .getFirst();
    assertThat(windows.sanitizedFilename()).isEqualTo("proof.txt");
    var unicode =
        validator
            .validate(List.of(file("teslim-çalışma.txt", "text/plain", "ok".getBytes())))
            .getFirst();
    assertThat(unicode.sanitizedFilename()).isEqualTo("teslim-_al__ma.txt");
    assertThatThrownBy(
            () ->
                validator.validate(
                    List.of(file("a".repeat(201) + ".txt", "text/plain", "ok".getBytes()))))
        .isInstanceOfSatisfying(
            FreelanceException.class,
            error ->
                assertThat(error.getCode()).isEqualTo("FREELANCE_ATTACHMENT_FILENAME_INVALID"));
    assertThatThrownBy(
            () -> validator.validate(List.of(file("bad\0.txt", "text/plain", "ok".getBytes()))))
        .isInstanceOf(FreelanceException.class);
  }

  @Test
  void enforcesPerFileAndTotalSizeBeforeReadingContent() {
    var oversized =
        new MockMultipartFile("files", "large.pdf", "application/pdf", new byte[0]) {
          @Override
          public boolean isEmpty() {
            return false;
          }

          @Override
          public long getSize() {
            return DeliveryAttachmentValidator.MAX_FILE_BYTES + 1;
          }
        };
    assertThatThrownBy(() -> validator.validate(List.of(oversized)))
        .isInstanceOfSatisfying(
            FreelanceException.class,
            error -> assertThat(error.getCode()).isEqualTo("FREELANCE_ATTACHMENT_FILE_TOO_LARGE"));

    var total = new ArrayList<MockMultipartFile>();
    for (int index = 0; index < 4; index++) {
      total.add(
          new MockMultipartFile("files", index + ".txt", "text/plain", new byte[] {1}) {
            @Override
            public long getSize() {
              return 20L * 1024 * 1024;
            }
          });
    }
    assertThatThrownBy(() -> validator.validate(new ArrayList<>(total)))
        .isInstanceOfSatisfying(
            FreelanceException.class,
            error ->
                assertThat(error.getCode()).isEqualTo("FREELANCE_ATTACHMENT_TOTAL_SIZE_EXCEEDED"));
  }

  private MockMultipartFile file(String name, String type, byte[] content) {
    return new MockMultipartFile("files", name, type, content);
  }

  private byte[] bytes(int... values) {
    var result = new byte[values.length];
    for (int index = 0; index < values.length; index++) result[index] = (byte) values[index];
    return result;
  }
}

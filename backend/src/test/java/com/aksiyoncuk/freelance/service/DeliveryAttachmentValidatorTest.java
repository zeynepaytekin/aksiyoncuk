package com.aksiyoncuk.freelance.service;

import static org.assertj.core.api.Assertions.*;

import com.aksiyoncuk.freelance.exception.FreelanceException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

class DeliveryAttachmentValidatorTest {
  private final DeliveryAttachmentValidator validator = new DeliveryAttachmentValidator();

  @Test
  void acceptsSupportedBinaryAndTextFiles() {
    var png =
        new MockMultipartFile(
            "files",
            "proof.png",
            "image/png",
            new byte[] {(byte) 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a});
    var text =
        new MockMultipartFile(
            "files", "notes.txt", "text/plain", "done".getBytes(StandardCharsets.UTF_8));
    assertThat(validator.validate(List.of(png, text))).hasSize(2);
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
}

package com.aksiyoncuk.freelance.service;

import com.aksiyoncuk.freelance.exception.FreelanceException;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.StandardCharsets;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

@Component
class DeliveryAttachmentValidator {
  static final int MAX_COUNT = 5;
  static final long MAX_FILE_BYTES = 25L * 1024 * 1024;
  static final long MAX_TOTAL_BYTES = 75L * 1024 * 1024;
  private static final int MAX_FILENAME = 200;
  private static final Map<String, Set<String>> EXTENSIONS =
      Map.of(
          "image/jpeg", Set.of("jpg", "jpeg"),
          "image/png", Set.of("png"),
          "image/webp", Set.of("webp"),
          "application/pdf", Set.of("pdf"),
          "text/plain", Set.of("txt"),
          "application/zip", Set.of("zip"),
          "application/x-zip-compressed", Set.of("zip"));

  List<ValidatedAttachment> validate(List<MultipartFile> files) {
    if (files == null || files.isEmpty()) return List.of();
    if (files.size() > MAX_COUNT)
      throw error(
          HttpStatus.BAD_REQUEST,
          "FREELANCE_ATTACHMENT_COUNT_EXCEEDED",
          "A delivery may contain at most 5 attachments");
    long total = 0;
    var result = new ArrayList<ValidatedAttachment>();
    for (var file : files) {
      if (file == null || file.isEmpty() || file.getSize() == 0)
        throw error(
            HttpStatus.BAD_REQUEST, "FREELANCE_ATTACHMENT_EMPTY", "Attachments must not be empty");
      if (file.getSize() > MAX_FILE_BYTES)
        throw error(
            HttpStatus.PAYLOAD_TOO_LARGE,
            "FREELANCE_ATTACHMENT_FILE_TOO_LARGE",
            "Each attachment must be 25 MB or smaller");
      total += file.getSize();
      if (total > MAX_TOTAL_BYTES)
        throw error(
            HttpStatus.PAYLOAD_TOO_LARGE,
            "FREELANCE_ATTACHMENT_TOTAL_SIZE_EXCEEDED",
            "Delivery attachments must total 75 MB or less");
      var contentType =
          Optional.ofNullable(file.getContentType()).orElse("").toLowerCase(Locale.ROOT);
      var allowed = EXTENSIONS.get(contentType);
      if (allowed == null)
        throw error(
            HttpStatus.UNSUPPORTED_MEDIA_TYPE,
            "FREELANCE_ATTACHMENT_TYPE_NOT_ALLOWED",
            "This attachment type is not supported");
      var original = Optional.ofNullable(file.getOriginalFilename()).orElse("").trim();
      if (original.isBlank() || original.length() > MAX_FILENAME || original.indexOf('\0') >= 0)
        throw error(
            HttpStatus.BAD_REQUEST,
            "FREELANCE_ATTACHMENT_FILENAME_INVALID",
            "Attachment filename is invalid");
      var leaf = original.replace('\\', '/');
      leaf = leaf.substring(leaf.lastIndexOf('/') + 1);
      var dot = leaf.lastIndexOf('.');
      var extension = dot < 0 ? "" : leaf.substring(dot + 1).toLowerCase(Locale.ROOT);
      if (!allowed.contains(extension))
        throw error(
            HttpStatus.UNSUPPORTED_MEDIA_TYPE,
            "FREELANCE_ATTACHMENT_TYPE_NOT_ALLOWED",
            "Attachment extension does not match its media type");
      var sanitized = leaf.replaceAll("[^A-Za-z0-9._-]", "_");
      if (sanitized.isBlank() || sanitized.equals(".") || sanitized.equals(".."))
        throw error(
            HttpStatus.BAD_REQUEST,
            "FREELANCE_ATTACHMENT_FILENAME_INVALID",
            "Attachment filename is invalid");
      try {
        var bytes = file.getBytes();
        verifySignature(contentType, bytes);
        result.add(new ValidatedAttachment(bytes, original, sanitized, contentType));
      } catch (IOException exception) {
        throw error(
            HttpStatus.BAD_REQUEST,
            "FREELANCE_ATTACHMENT_READ_FAILED",
            "Attachment could not be read");
      }
    }
    return List.copyOf(result);
  }

  private void verifySignature(String type, byte[] bytes) {
    boolean valid =
        switch (type) {
          case "image/jpeg" -> starts(bytes, 0xff, 0xd8, 0xff);
          case "image/png" -> starts(bytes, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
          case "image/webp" ->
              bytes.length >= 12 && ascii(bytes, 0, "RIFF") && ascii(bytes, 8, "WEBP");
          case "application/pdf" -> ascii(bytes, 0, "%PDF-");
          case "application/zip", "application/x-zip-compressed" ->
              starts(bytes, 0x50, 0x4b, 0x03, 0x04)
                  || starts(bytes, 0x50, 0x4b, 0x05, 0x06)
                  || starts(bytes, 0x50, 0x4b, 0x07, 0x08);
          case "text/plain" -> validText(bytes);
          default -> false;
        };
    if (!valid)
      throw error(
          HttpStatus.UNSUPPORTED_MEDIA_TYPE,
          "FREELANCE_ATTACHMENT_CONTENT_MISMATCH",
          "Attachment content does not match its media type");
  }

  private boolean validText(byte[] bytes) {
    for (byte value : bytes) if (value == 0) return false;
    try {
      StandardCharsets.UTF_8.newDecoder().decode(ByteBuffer.wrap(bytes));
      return true;
    } catch (CharacterCodingException ignored) {
      return false;
    }
  }

  private boolean starts(byte[] bytes, int... prefix) {
    if (bytes.length < prefix.length) return false;
    for (int i = 0; i < prefix.length; i++) if ((bytes[i] & 255) != prefix[i]) return false;
    return true;
  }

  private boolean ascii(byte[] bytes, int offset, String value) {
    if (bytes.length < offset + value.length()) return false;
    for (int i = 0; i < value.length(); i++) if (bytes[offset + i] != value.charAt(i)) return false;
    return true;
  }

  private FreelanceException error(HttpStatus status, String code, String message) {
    return new FreelanceException(status, code, message);
  }

  record ValidatedAttachment(
      byte[] bytes, String originalFilename, String sanitizedFilename, String contentType) {}
}

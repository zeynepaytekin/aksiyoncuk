package com.aksiyoncuk.media.service;

import com.aksiyoncuk.media.exception.MediaException;
import java.io.IOException;
import java.util.Locale;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

@Component
public class MediaFileValidator {
  private static final Map<String, String> EXTENSIONS =
      Map.of("image/jpeg", "jpg", "image/png", "png", "image/webp", "webp");

  ValidatedImage validate(MultipartFile file, long maximumBytes) {
    if (file == null)
      throw error(HttpStatus.BAD_REQUEST, "MEDIA_FILE_REQUIRED", "File is required");
    if (file.isEmpty() || file.getSize() < 1)
      throw error(HttpStatus.BAD_REQUEST, "MEDIA_FILE_EMPTY", "File must not be empty");
    if (file.getSize() > maximumBytes)
      throw error(
          HttpStatus.PAYLOAD_TOO_LARGE, "MEDIA_FILE_TOO_LARGE", "File exceeds the allowed size");
    var supplied =
        file.getContentType() == null ? "" : file.getContentType().toLowerCase(Locale.ROOT);
    if (!EXTENSIONS.containsKey(supplied))
      throw error(
          HttpStatus.UNSUPPORTED_MEDIA_TYPE,
          "MEDIA_TYPE_NOT_ALLOWED",
          "Only JPEG, PNG, and WebP images are allowed");
    try {
      var bytes = file.getBytes();
      var detected = detect(bytes);
      if (detected == null)
        throw error(
            HttpStatus.UNSUPPORTED_MEDIA_TYPE,
            "MEDIA_TYPE_NOT_ALLOWED",
            "File is not an allowed image");
      if (!supplied.equals(detected))
        throw error(
            HttpStatus.UNSUPPORTED_MEDIA_TYPE,
            "MEDIA_CONTENT_TYPE_MISMATCH",
            "File content does not match its media type");
      return new ValidatedImage(
          bytes,
          detected,
          sanitize(file.getOriginalFilename(), EXTENSIONS.get(detected)),
          EXTENSIONS.get(detected));
    } catch (IOException exception) {
      throw new MediaException(
          HttpStatus.BAD_REQUEST, "MEDIA_UPLOAD_FAILED", "File could not be read", exception);
    }
  }

  String sanitize(String original, String extension) {
    if (original == null || original.isBlank()) return "upload." + extension;
    var name = original.replace('\\', '/');
    name = name.substring(name.lastIndexOf('/') + 1).replaceAll("[^A-Za-z0-9._-]", "_");
    if (name.isBlank() || name.equals(".") || name.equals("..")) name = "upload." + extension;
    if (name.length() > 200) name = name.substring(name.length() - 200);
    return name;
  }

  private String detect(byte[] value) {
    if (value.length >= 3
        && (value[0] & 255) == 0xff
        && (value[1] & 255) == 0xd8
        && (value[2] & 255) == 0xff) return "image/jpeg";
    if (value.length >= 8
        && (value[0] & 255) == 0x89
        && value[1] == 0x50
        && value[2] == 0x4e
        && value[3] == 0x47
        && value[4] == 0x0d
        && value[5] == 0x0a
        && value[6] == 0x1a
        && value[7] == 0x0a) return "image/png";
    if (value.length >= 12
        && value[0] == 'R'
        && value[1] == 'I'
        && value[2] == 'F'
        && value[3] == 'F'
        && value[8] == 'W'
        && value[9] == 'E'
        && value[10] == 'B'
        && value[11] == 'P') return "image/webp";
    return null;
  }

  private MediaException error(HttpStatus status, String code, String message) {
    return new MediaException(status, code, message);
  }
}

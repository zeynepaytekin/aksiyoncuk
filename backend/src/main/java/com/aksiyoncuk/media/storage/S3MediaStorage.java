package com.aksiyoncuk.media.storage;

import com.aksiyoncuk.media.config.MediaProperties;
import com.aksiyoncuk.media.exception.MediaException;
import java.net.URI;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.S3Exception;

@Component
public class S3MediaStorage implements MediaStorage {

  private final S3Client client;
  private final MediaProperties properties;

  public S3MediaStorage(S3Client client, MediaProperties properties) {
    this.client = client;
    this.properties = properties;
  }

  @Override
  public void put(String key, byte[] content, String contentType, String filename) {
    try {
      client.putObject(
          request ->
              request
                  .bucket(properties.bucket())
                  .key(key)
                  .contentType(contentType)
                  .contentDisposition("inline; filename=\"" + filename + "\"")
                  .cacheControl("public, max-age=31536000, immutable")
                  .metadata(java.util.Map.of("x-content-type-options", "nosniff")),
          RequestBody.fromBytes(content));
    } catch (S3Exception exception) {
      throw unavailable("Media storage is unavailable", exception);
    }
  }

  @Override
  public void delete(String key) {
    try {
      client.deleteObject(request -> request.bucket(properties.bucket()).key(key));
    } catch (S3Exception exception) {
      throw unavailable("Media cleanup could not be completed", exception);
    }
  }

  @Override
  public boolean exists(String key) {
    try {
      client.headObject(request -> request.bucket(properties.bucket()).key(key));
      return true;
    } catch (NoSuchKeyException exception) {
      return false;
    } catch (S3Exception exception) {
      if (exception.statusCode() == 404) return false;
      throw unavailable("Media storage is unavailable", exception);
    }
  }

  @Override
  public URI resolvePublicUrl(String key) {
    return URI.create(properties.publicBaseUrl().toString().replaceAll("/+$", "") + "/" + key);
  }

  private MediaException unavailable(String message, Exception cause) {
    return new MediaException(
        HttpStatus.SERVICE_UNAVAILABLE, "MEDIA_STORAGE_UNAVAILABLE", message, cause);
  }
}

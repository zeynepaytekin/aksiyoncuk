package com.aksiyoncuk.media.storage;

import java.net.URI;

public interface MediaStorage {
  void put(String key, byte[] content, String contentType, String filename);

  void delete(String key);

  boolean exists(String key);

  URI resolvePublicUrl(String key);

  default void putPrivate(String key, byte[] content, String contentType, String filename) {
    throw new UnsupportedOperationException("Private storage is not configured");
  }

  default byte[] getPrivate(String key) {
    throw new UnsupportedOperationException("Private storage is not configured");
  }

  default void deletePrivate(String key) {
    throw new UnsupportedOperationException("Private storage is not configured");
  }
}

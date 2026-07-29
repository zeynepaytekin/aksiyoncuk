package com.aksiyoncuk.media.storage;

import java.net.URI;

public interface MediaStorage {
  void put(String key, byte[] content, String contentType, String filename);

  void delete(String key);

  boolean exists(String key);

  URI resolvePublicUrl(String key);
}

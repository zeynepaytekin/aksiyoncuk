package com.aksiyoncuk.media.repository;

import com.aksiyoncuk.media.entity.MediaAsset;
import com.aksiyoncuk.media.entity.MediaStatus;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MediaAssetRepository extends JpaRepository<MediaAsset, UUID> {
  Optional<MediaAsset> findByIdAndStatus(UUID id, MediaStatus status);
}

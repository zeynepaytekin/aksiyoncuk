package com.aksiyoncuk.media.repository;

import com.aksiyoncuk.media.entity.WorkMedia;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WorkMediaRepository extends JpaRepository<WorkMedia, UUID> {
  List<WorkMedia> findByWorkIdOrderByDisplayOrderAscIdAsc(UUID workId);

  Optional<WorkMedia> findByWorkIdAndMediaAssetId(UUID workId, UUID mediaAssetId);

  long countByWorkId(UUID workId);
}

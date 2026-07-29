package com.aksiyoncuk.media.repository;

import com.aksiyoncuk.media.entity.PostMedia;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PostMediaRepository extends JpaRepository<PostMedia, UUID> {
  List<PostMedia> findByPostIdOrderByDisplayOrderAscIdAsc(UUID postId);

  Optional<PostMedia> findByPostIdAndMediaAssetId(UUID postId, UUID mediaAssetId);

  long countByPostId(UUID postId);
}

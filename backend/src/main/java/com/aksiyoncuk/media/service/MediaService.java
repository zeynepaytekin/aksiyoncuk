package com.aksiyoncuk.media.service;

import com.aksiyoncuk.auth.security.AuthenticatedUser;
import com.aksiyoncuk.media.config.MediaProperties;
import com.aksiyoncuk.media.dto.MediaAssetResponse;
import com.aksiyoncuk.media.dto.MediaListItemResponse;
import com.aksiyoncuk.media.dto.MediaOrderRequest;
import com.aksiyoncuk.media.entity.*;
import com.aksiyoncuk.media.exception.MediaException;
import com.aksiyoncuk.media.repository.*;
import com.aksiyoncuk.media.storage.MediaStorage;
import com.aksiyoncuk.post.exception.PostNotFoundException;
import com.aksiyoncuk.post.repository.PostRepository;
import com.aksiyoncuk.profile.exception.ProfileNotFoundException;
import com.aksiyoncuk.profile.repository.ProfileRepository;
import com.aksiyoncuk.user.repository.UserRepository;
import com.aksiyoncuk.work.exception.WorkNotFoundException;
import com.aksiyoncuk.work.repository.WorkRepository;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

@Service
public class MediaService {
  private static final Logger LOGGER = LoggerFactory.getLogger(MediaService.class);
  private static final DateTimeFormatter PATH_DATE =
      DateTimeFormatter.ofPattern("uuuu/MM").withZone(ZoneOffset.UTC);

  private final MediaProperties properties;
  private final MediaStorage storage;
  private final MediaFileValidator validator;
  private final MediaAssetRepository assets;
  private final PostMediaRepository postMedia;
  private final WorkMediaRepository workMedia;
  private final ProfileRepository profiles;
  private final PostRepository posts;
  private final WorkRepository works;
  private final UserRepository users;
  private final JdbcTemplate jdbc;

  public MediaService(
      MediaProperties properties,
      MediaStorage storage,
      MediaFileValidator validator,
      MediaAssetRepository assets,
      PostMediaRepository postMedia,
      WorkMediaRepository workMedia,
      ProfileRepository profiles,
      PostRepository posts,
      WorkRepository works,
      UserRepository users,
      JdbcTemplate jdbc) {
    this.properties = properties;
    this.storage = storage;
    this.validator = validator;
    this.assets = assets;
    this.postMedia = postMedia;
    this.workMedia = workMedia;
    this.profiles = profiles;
    this.posts = posts;
    this.works = works;
    this.users = users;
    this.jdbc = jdbc;
  }

  @Transactional
  public MediaAssetResponse uploadAvatar(AuthenticatedUser principal, MultipartFile file) {
    var profile =
        profiles.findLockedByUserId(principal.userId()).orElseThrow(ProfileNotFoundException::new);
    var previous = profile.getAvatarMedia();
    var asset = store(principal, file, MediaUsageType.PROFILE_AVATAR, properties.avatarMaxBytes());
    try {
      profile.replaceAvatar(asset);
      profiles.saveAndFlush(profile);
    } catch (RuntimeException exception) {
      compensate(asset);
      throw exception;
    }
    cleanupReplaced(previous);
    return response(asset, null);
  }

  @Transactional
  public MediaAssetResponse uploadCover(AuthenticatedUser principal, MultipartFile file) {
    var profile =
        profiles.findLockedByUserId(principal.userId()).orElseThrow(ProfileNotFoundException::new);
    var previous = profile.getCoverMedia();
    var asset = store(principal, file, MediaUsageType.PROFILE_COVER, properties.coverMaxBytes());
    try {
      profile.replaceCover(asset);
      profiles.saveAndFlush(profile);
    } catch (RuntimeException exception) {
      compensate(asset);
      throw exception;
    }
    cleanupReplaced(previous);
    return response(asset, null);
  }

  @Transactional
  public void deleteAvatar(AuthenticatedUser principal) {
    var profile =
        profiles.findLockedByUserId(principal.userId()).orElseThrow(ProfileNotFoundException::new);
    var previous = profile.getAvatarMedia();
    if (previous == null) return;
    profile.replaceAvatar(null);
    profiles.saveAndFlush(profile);
    cleanupReplaced(previous);
  }

  @Transactional
  public void deleteCover(AuthenticatedUser principal) {
    var profile =
        profiles.findLockedByUserId(principal.userId()).orElseThrow(ProfileNotFoundException::new);
    var previous = profile.getCoverMedia();
    if (previous == null) return;
    profile.replaceCover(null);
    profiles.saveAndFlush(profile);
    cleanupReplaced(previous);
  }

  @Transactional
  public MediaAssetResponse uploadPost(
      UUID postId, AuthenticatedUser principal, MultipartFile file) {
    var post = posts.findLockedById(postId).orElseThrow(PostNotFoundException::new);
    owner(post.getAuthor().getId(), principal);
    int order = Math.toIntExact(postMedia.countByPostId(postId));
    if (order >= 4) throw conflict("MEDIA_LIMIT_EXCEEDED", "Posts support at most 4 images");
    var asset = store(principal, file, MediaUsageType.POST_IMAGE, properties.postMaxBytes());
    try {
      postMedia.saveAndFlush(new PostMedia(post, asset, order));
    } catch (RuntimeException exception) {
      compensate(asset);
      throw conflict("MEDIA_LIMIT_EXCEEDED", "Post media could not be added concurrently");
    }
    return response(asset, order);
  }

  @Transactional
  public MediaAssetResponse uploadWork(
      UUID workId, AuthenticatedUser principal, MultipartFile file) {
    var work = works.findLockedById(workId).orElseThrow(WorkNotFoundException::new);
    owner(work.getOwner().getId(), principal);
    int order = Math.toIntExact(workMedia.countByWorkId(workId));
    if (order >= 12) throw conflict("MEDIA_LIMIT_EXCEEDED", "Works support at most 12 images");
    var asset = store(principal, file, MediaUsageType.WORK_IMAGE, properties.workMaxBytes());
    try {
      workMedia.saveAndFlush(new WorkMedia(work, asset, order));
    } catch (RuntimeException exception) {
      compensate(asset);
      throw conflict("MEDIA_LIMIT_EXCEEDED", "Work media could not be added concurrently");
    }
    return response(asset, order);
  }

  @Transactional
  public MediaAssetResponse uploadFreelanceService(
      UUID serviceId, AuthenticatedUser principal, MultipartFile file) {
    var listing =
        jdbc
            .query(
                "SELECT seller_user_id,status FROM freelance_services WHERE id=? FOR UPDATE",
                (rs, n) ->
                    new Object[] {
                      rs.getObject("seller_user_id", UUID.class), rs.getString("status")
                    },
                serviceId)
            .stream()
            .findFirst()
            .orElseThrow(
                () -> missing("FREELANCE_SERVICE_NOT_FOUND", "Freelance service was not found"));
    owner((UUID) listing[0], principal);
    if ("ARCHIVED".equals(listing[1]))
      throw conflict("FREELANCE_SERVICE_NOT_EDITABLE", "Archived listings cannot be changed");
    var order =
        Objects.requireNonNull(
            jdbc.queryForObject(
                "SELECT count(*) FROM freelance_service_media WHERE service_id=?",
                Integer.class,
                serviceId));
    if (order >= 8)
      throw conflict(
          "FREELANCE_SERVICE_MEDIA_LIMIT_EXCEEDED", "Freelance services support at most 8 images");
    var asset =
        store(principal, file, MediaUsageType.FREELANCE_SERVICE_IMAGE, properties.workMaxBytes());
    try {
      jdbc.update(
          "INSERT INTO freelance_service_media(id,service_id,media_asset_id,display_order) VALUES (?,?,?,?)",
          UUID.randomUUID(),
          serviceId,
          asset.getId(),
          order);
    } catch (RuntimeException exception) {
      compensate(asset);
      throw conflict(
          "FREELANCE_SERVICE_MEDIA_LIMIT_EXCEEDED",
          "Freelance media could not be added concurrently");
    }
    return response(asset, order);
  }

  @Transactional
  public void deleteFreelanceService(UUID serviceId, UUID mediaId, AuthenticatedUser principal) {
    lockFreelanceOwner(serviceId, principal);
    var asset =
        assets
            .findById(mediaId)
            .orElseThrow(() -> missing("MEDIA_NOT_FOUND", "Freelance service media was not found"));
    var changed =
        jdbc.update(
            "DELETE FROM freelance_service_media WHERE service_id=? AND media_asset_id=?",
            serviceId,
            mediaId);
    if (changed != 1) throw missing("MEDIA_NOT_FOUND", "Freelance service media was not found");
    compactFreelance(serviceId);
    cleanupReplaced(asset);
  }

  @Transactional
  public List<MediaListItemResponse> reorderFreelanceService(
      UUID serviceId, AuthenticatedUser principal, MediaOrderRequest request) {
    lockFreelanceOwner(serviceId, principal);
    var current =
        jdbc.queryForList(
            "SELECT media_asset_id FROM freelance_service_media WHERE service_id=? ORDER BY display_order,id",
            UUID.class,
            serviceId);
    validateOrder(request, current);
    applyFreelanceOrder(serviceId, request.mediaIds());
    return freelanceItems(serviceId);
  }

  @Transactional(readOnly = true)
  public List<MediaListItemResponse> freelanceItems(UUID serviceId) {
    return jdbc.query(
        """
        SELECT a.id,a.storage_key,a.content_type,m.display_order
        FROM freelance_service_media m JOIN media_assets a ON a.id=m.media_asset_id
        WHERE m.service_id=? AND a.status='ACTIVE' ORDER BY m.display_order,m.id
        """,
        (rs, n) ->
            new MediaListItemResponse(
                rs.getObject("id", UUID.class),
                storage.resolvePublicUrl(rs.getString("storage_key")).toString(),
                rs.getString("content_type"),
                null,
                null,
                rs.getInt("display_order")),
        serviceId);
  }

  @Transactional
  public void deletePost(UUID postId, UUID mediaId, AuthenticatedUser principal) {
    var post = posts.findLockedById(postId).orElseThrow(PostNotFoundException::new);
    owner(post.getAuthor().getId(), principal);
    var relation =
        postMedia
            .findByPostIdAndMediaAssetId(postId, mediaId)
            .orElseThrow(() -> missing("MEDIA_NOT_FOUND", "Media was not found"));
    postMedia.delete(relation);
    postMedia.flush();
    compactPost(postId);
    cleanupReplaced(relation.getMediaAsset());
  }

  @Transactional
  public void deleteWork(UUID workId, UUID mediaId, AuthenticatedUser principal) {
    var work = works.findLockedById(workId).orElseThrow(WorkNotFoundException::new);
    owner(work.getOwner().getId(), principal);
    var relation =
        workMedia
            .findByWorkIdAndMediaAssetId(workId, mediaId)
            .orElseThrow(() -> missing("MEDIA_NOT_FOUND", "Media was not found"));
    workMedia.delete(relation);
    workMedia.flush();
    compactWork(workId);
    cleanupReplaced(relation.getMediaAsset());
  }

  @Transactional
  public List<MediaListItemResponse> reorderPost(
      UUID postId, AuthenticatedUser principal, MediaOrderRequest request) {
    var post = posts.findLockedById(postId).orElseThrow(PostNotFoundException::new);
    owner(post.getAuthor().getId(), principal);
    var relations = postMedia.findByPostIdOrderByDisplayOrderAscIdAsc(postId);
    validateOrder(request, relations.stream().map(r -> r.getMediaAsset().getId()).toList());
    applyPostOrder(relations, request.mediaIds());
    return postItems(postId);
  }

  @Transactional
  public List<MediaListItemResponse> reorderWork(
      UUID workId, AuthenticatedUser principal, MediaOrderRequest request) {
    var work = works.findLockedById(workId).orElseThrow(WorkNotFoundException::new);
    owner(work.getOwner().getId(), principal);
    var relations = workMedia.findByWorkIdOrderByDisplayOrderAscIdAsc(workId);
    validateOrder(request, relations.stream().map(r -> r.getMediaAsset().getId()).toList());
    applyWorkOrder(relations, request.mediaIds());
    return workItems(workId);
  }

  @Transactional(readOnly = true)
  public List<MediaListItemResponse> postItems(UUID postId) {
    return postMedia.findByPostIdOrderByDisplayOrderAscIdAsc(postId).stream()
        .filter(r -> r.getMediaAsset().getStatus() == MediaStatus.ACTIVE)
        .map(r -> item(r.getMediaAsset(), r.getDisplayOrder()))
        .toList();
  }

  @Transactional(readOnly = true)
  public List<MediaListItemResponse> workItems(UUID workId) {
    return workMedia.findByWorkIdOrderByDisplayOrderAscIdAsc(workId).stream()
        .filter(r -> r.getMediaAsset().getStatus() == MediaStatus.ACTIVE)
        .map(r -> item(r.getMediaAsset(), r.getDisplayOrder()))
        .toList();
  }

  public String publicUrl(MediaAsset asset) {
    return asset == null || asset.getStatus() != MediaStatus.ACTIVE
        ? null
        : storage.resolvePublicUrl(asset.getStorageKey()).toString();
  }

  public String publicUrl(String storageKey) {
    return storageKey == null ? null : storage.resolvePublicUrl(storageKey).toString();
  }

  @Transactional
  public void removePostMedia(UUID postId) {
    var relations = postMedia.findByPostIdOrderByDisplayOrderAscIdAsc(postId);
    postMedia.deleteAll(relations);
    relations.forEach(relation -> cleanupReplaced(relation.getMediaAsset()));
  }

  @Transactional
  public void removeWorkMedia(UUID workId) {
    var relations = workMedia.findByWorkIdOrderByDisplayOrderAscIdAsc(workId);
    workMedia.deleteAll(relations);
    relations.forEach(relation -> cleanupReplaced(relation.getMediaAsset()));
  }

  private MediaAsset store(
      AuthenticatedUser principal, MultipartFile file, MediaUsageType usage, long limit) {
    var image = validator.validate(file, limit);
    var user =
        users
            .findById(principal.userId())
            .orElseThrow(() -> forbidden("MEDIA_ACCESS_FORBIDDEN", "Media owner is unavailable"));
    var key =
        usage.name().toLowerCase(Locale.ROOT)
            + "/"
            + PATH_DATE.format(java.time.Instant.now())
            + "/"
            + UUID.randomUUID()
            + "."
            + image.extension();
    storage.put(key, image.bytes(), image.contentType(), image.filename());
    var asset =
        new MediaAsset(
            user, key, image.filename(), image.contentType(), image.bytes().length, usage);
    try {
      return assets.saveAndFlush(asset);
    } catch (RuntimeException exception) {
      safeDelete(key);
      throw new MediaException(
          HttpStatus.INTERNAL_SERVER_ERROR,
          "MEDIA_UPLOAD_FAILED",
          "Media metadata could not be saved",
          exception);
    }
  }

  private void compensate(MediaAsset asset) {
    safeDelete(asset.getStorageKey());
  }

  private void cleanupReplaced(MediaAsset asset) {
    if (asset == null || asset.getStatus() == MediaStatus.DELETED) return;
    asset.markDeleted();
    assets.save(asset);
    afterCommit(() -> safeDelete(asset.getStorageKey()));
  }

  private void safeDelete(String key) {
    try {
      storage.delete(key);
    } catch (RuntimeException exception) {
      LOGGER.warn("Deferred media object cleanup failed", exception);
    }
  }

  private void afterCommit(Runnable operation) {
    TransactionSynchronizationManager.registerSynchronization(
        new TransactionSynchronization() {
          @Override
          public void afterCommit() {
            operation.run();
          }
        });
  }

  private void owner(UUID ownerId, AuthenticatedUser principal) {
    if (!ownerId.equals(principal.userId()))
      throw forbidden("MEDIA_ACCESS_FORBIDDEN", "You do not own this media parent");
  }

  private void validateOrder(MediaOrderRequest request, List<UUID> current) {
    var supplied = request == null ? null : request.mediaIds();
    if (supplied == null
        || supplied.size() != current.size()
        || new HashSet<>(supplied).size() != supplied.size()
        || !new HashSet<>(supplied).equals(new HashSet<>(current)))
      throw new MediaException(
          HttpStatus.BAD_REQUEST,
          "MEDIA_ORDER_INVALID",
          "Order must contain every current media ID exactly once");
  }

  private void applyPostOrder(List<PostMedia> relations, List<UUID> ids) {
    for (int i = 0; i < relations.size(); i++) relations.get(i).setDisplayOrder(-100 - i);
    postMedia.flush();
    var byId = new HashMap<UUID, PostMedia>();
    relations.forEach(r -> byId.put(r.getMediaAsset().getId(), r));
    for (int i = 0; i < ids.size(); i++) byId.get(ids.get(i)).setDisplayOrder(i);
    postMedia.flush();
  }

  private void applyWorkOrder(List<WorkMedia> relations, List<UUID> ids) {
    for (int i = 0; i < relations.size(); i++) relations.get(i).setDisplayOrder(-100 - i);
    workMedia.flush();
    var byId = new HashMap<UUID, WorkMedia>();
    relations.forEach(r -> byId.put(r.getMediaAsset().getId(), r));
    for (int i = 0; i < ids.size(); i++) byId.get(ids.get(i)).setDisplayOrder(i);
    workMedia.flush();
  }

  private void compactPost(UUID id) {
    var relations = postMedia.findByPostIdOrderByDisplayOrderAscIdAsc(id);
    applyPostOrder(relations, relations.stream().map(r -> r.getMediaAsset().getId()).toList());
  }

  private void compactWork(UUID id) {
    var relations = workMedia.findByWorkIdOrderByDisplayOrderAscIdAsc(id);
    applyWorkOrder(relations, relations.stream().map(r -> r.getMediaAsset().getId()).toList());
  }

  private void lockFreelanceOwner(UUID serviceId, AuthenticatedUser principal) {
    var result =
        jdbc
            .query(
                "SELECT seller_user_id,status FROM freelance_services WHERE id=? FOR UPDATE",
                (rs, n) ->
                    new Object[] {
                      rs.getObject("seller_user_id", UUID.class), rs.getString("status")
                    },
                serviceId)
            .stream()
            .findFirst()
            .orElseThrow(
                () -> missing("FREELANCE_SERVICE_NOT_FOUND", "Freelance service was not found"));
    owner((UUID) result[0], principal);
    if ("ARCHIVED".equals(result[1]))
      throw conflict("FREELANCE_SERVICE_NOT_EDITABLE", "Archived listings cannot be changed");
  }

  private void applyFreelanceOrder(UUID serviceId, List<UUID> ids) {
    jdbc.update(
        "UPDATE freelance_service_media SET display_order=-100-display_order WHERE service_id=?",
        serviceId);
    for (int i = 0; i < ids.size(); i++)
      jdbc.update(
          "UPDATE freelance_service_media SET display_order=? WHERE service_id=? AND media_asset_id=?",
          i,
          serviceId,
          ids.get(i));
  }

  private void compactFreelance(UUID serviceId) {
    var ids =
        jdbc.queryForList(
            "SELECT media_asset_id FROM freelance_service_media WHERE service_id=? ORDER BY display_order,id",
            UUID.class,
            serviceId);
    applyFreelanceOrder(serviceId, ids);
  }

  private MediaAssetResponse response(MediaAsset asset, Integer order) {
    return new MediaAssetResponse(
        asset.getId(),
        storage.resolvePublicUrl(asset.getStorageKey()).toString(),
        asset.getContentType(),
        asset.getSizeBytes(),
        asset.getUsageType(),
        order,
        asset.getCreatedAt());
  }

  private MediaListItemResponse item(MediaAsset asset, int order) {
    return new MediaListItemResponse(
        asset.getId(),
        storage.resolvePublicUrl(asset.getStorageKey()).toString(),
        asset.getContentType(),
        null,
        null,
        order);
  }

  private MediaException conflict(String code, String message) {
    return new MediaException(HttpStatus.CONFLICT, code, message);
  }

  private MediaException missing(String code, String message) {
    return new MediaException(HttpStatus.NOT_FOUND, code, message);
  }

  private MediaException forbidden(String code, String message) {
    return new MediaException(HttpStatus.FORBIDDEN, code, message);
  }
}

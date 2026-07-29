package com.aksiyoncuk.work.repository;

import com.aksiyoncuk.work.entity.Work;
import com.aksiyoncuk.work.entity.WorkType;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface WorkRepository extends JpaRepository<Work, UUID> {
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("SELECT w FROM Work w JOIN FETCH w.owner WHERE w.id = :id")
  Optional<Work> findLockedById(@Param("id") UUID id);

  @Query(
      value =
          """
          SELECT new com.aksiyoncuk.work.repository.WorkRow(
            w.id, w.title, w.description, w.workType, w.projectUrl, w.releaseYear,
            w.createdAt, w.updatedAt, u.id, u.username, u.fullName, p.professionalTitle)
          FROM Work w
          JOIN w.owner u
          JOIN Profile p ON p.user = u
          WHERE u.id = :ownerId
          """,
      countQuery = "SELECT count(w) FROM Work w WHERE w.owner.id = :ownerId")
  Page<WorkRow> findByOwnerIdProjected(@Param("ownerId") UUID ownerId, Pageable pageable);

  @Query(
      value =
          """
          SELECT new com.aksiyoncuk.work.repository.WorkRow(
            w.id, w.title, w.description, w.workType, w.projectUrl, w.releaseYear,
            w.createdAt, w.updatedAt, u.id, u.username, u.fullName, p.professionalTitle)
          FROM Work w
          JOIN w.owner u
          JOIN Profile p ON p.user = u
          WHERE u.username = :username
          """,
      countQuery = "SELECT count(w) FROM Work w WHERE w.owner.username = :username")
  Page<WorkRow> findByUsernameProjected(@Param("username") String username, Pageable pageable);

  @Query(
      """
      SELECT new com.aksiyoncuk.work.repository.WorkRow(
        w.id, w.title, w.description, w.workType, w.projectUrl, w.releaseYear,
        w.createdAt, w.updatedAt, u.id, u.username, u.fullName, p.professionalTitle)
      FROM Work w
      JOIN w.owner u
      JOIN Profile p ON p.user = u
      WHERE w.id = :id
      """)
  Optional<WorkRow> findProjectedById(@Param("id") UUID id);

  long countByOwnerId(UUID ownerId);

  @Query(
      value =
          """
          SELECT new com.aksiyoncuk.work.repository.WorkRow(
            w.id, w.title, w.description, w.workType, w.projectUrl, w.releaseYear,
            w.createdAt, w.updatedAt, u.id, u.username, u.fullName, p.professionalTitle)
          FROM Work w JOIN w.owner u JOIN Profile p ON p.user = u
          WHERE (lower(w.title) like :pattern escape '!'
             OR lower(coalesce(w.description, '')) like :pattern escape '!'
             OR lower(u.username) like :pattern escape '!'
             OR lower(u.fullName) like :pattern escape '!')
            AND (:workType IS NULL OR w.workType = :workType)
            AND (:ownerUsername IS NULL OR u.username = :ownerUsername)
            AND (:releaseYear IS NULL OR w.releaseYear = :releaseYear)
          """,
      countQuery =
          """
          SELECT count(w) FROM Work w JOIN w.owner u
          WHERE (lower(w.title) like :pattern escape '!'
             OR lower(coalesce(w.description, '')) like :pattern escape '!'
             OR lower(u.username) like :pattern escape '!'
             OR lower(u.fullName) like :pattern escape '!')
            AND (:workType IS NULL OR w.workType = :workType)
            AND (:ownerUsername IS NULL OR u.username = :ownerUsername)
            AND (:releaseYear IS NULL OR w.releaseYear = :releaseYear)
          """)
  Page<WorkRow> search(
      @Param("pattern") String pattern,
      @Param("workType") WorkType workType,
      @Param("ownerUsername") String ownerUsername,
      @Param("releaseYear") Integer releaseYear,
      Pageable pageable);
}

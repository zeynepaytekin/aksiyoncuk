package com.aksiyoncuk.work.repository;

import com.aksiyoncuk.work.entity.Work;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface WorkRepository extends JpaRepository<Work, UUID> {

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
}

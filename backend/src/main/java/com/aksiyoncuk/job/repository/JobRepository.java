package com.aksiyoncuk.job.repository;

import com.aksiyoncuk.job.entity.*;
import java.util.*;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface JobRepository extends JpaRepository<Job, UUID> {
  String PROJECTION =
      "SELECT new com.aksiyoncuk.job.repository.JobRow("
          + "j.id,j.title,j.description,j.category,j.workMode,j.location,j.compensationType,"
          + "j.compensationAmount,j.currency,j.status,j.applicationDeadline,j.createdAt,j.updatedAt,"
          + "u.id,u.username,u.fullName,p.professionalTitle,"
          + "(SELECT count(a) FROM JobApplication a WHERE a.job=j)) FROM Job j JOIN j.owner u "
          + "JOIN Profile p ON p.user = u ";

  @Query(
      value =
          PROJECTION
              + "WHERE j.status=:status AND (:category IS NULL OR j.category=:category) "
              + "AND (:workMode IS NULL OR j.workMode=:workMode)",
      countQuery =
          "SELECT count(j) FROM Job j WHERE j.status=:status "
              + "AND (:category IS NULL OR j.category=:category) AND (:workMode IS NULL OR j.workMode=:workMode)")
  Page<JobRow> findPublicProjected(
      @Param("status") JobStatus status,
      @Param("category") JobCategory category,
      @Param("workMode") WorkMode workMode,
      Pageable pageable);

  @Query(
      value = PROJECTION + "WHERE u.id=:ownerId AND (:status IS NULL OR j.status=:status)",
      countQuery =
          "SELECT count(j) FROM Job j WHERE j.owner.id=:ownerId "
              + "AND (:status IS NULL OR j.status=:status)")
  Page<JobRow> findOwnerProjected(
      @Param("ownerId") UUID ownerId, @Param("status") JobStatus status, Pageable pageable);

  @Query(PROJECTION + "WHERE j.id=:id")
  Optional<JobRow> findProjectedById(@Param("id") UUID id);

  long countByOwnerId(UUID ownerId);

  @Query(
      value =
          PROJECTION
              + "WHERE (lower(j.title) like :pattern escape '!' "
              + "OR lower(j.description) like :pattern escape '!' "
              + "OR lower(coalesce(j.location, '')) like :pattern escape '!' "
              + "OR lower(u.username) like :pattern escape '!' "
              + "OR lower(u.fullName) like :pattern escape '!') "
              + "AND j.status=:status AND (:category IS NULL OR j.category=:category) "
              + "AND (:workMode IS NULL OR j.workMode=:workMode) "
              + "AND (:compensationType IS NULL OR j.compensationType=:compensationType) "
              + "AND (:ownerUsername IS NULL OR u.username=:ownerUsername)",
      countQuery =
          "SELECT count(j) FROM Job j JOIN j.owner u "
              + "WHERE (lower(j.title) like :pattern escape '!' "
              + "OR lower(j.description) like :pattern escape '!' "
              + "OR lower(coalesce(j.location, '')) like :pattern escape '!' "
              + "OR lower(u.username) like :pattern escape '!' "
              + "OR lower(u.fullName) like :pattern escape '!') "
              + "AND j.status=:status AND (:category IS NULL OR j.category=:category) "
              + "AND (:workMode IS NULL OR j.workMode=:workMode) "
              + "AND (:compensationType IS NULL OR j.compensationType=:compensationType) "
              + "AND (:ownerUsername IS NULL OR u.username=:ownerUsername)")
  Page<JobRow> search(
      @Param("pattern") String pattern,
      @Param("status") JobStatus status,
      @Param("category") JobCategory category,
      @Param("workMode") WorkMode workMode,
      @Param("compensationType") CompensationType compensationType,
      @Param("ownerUsername") String ownerUsername,
      Pageable pageable);
}

package com.aksiyoncuk.job.application.repository;

import com.aksiyoncuk.job.application.entity.*;
import java.util.*;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface JobApplicationRepository extends JpaRepository<JobApplication, UUID> {
  String PROJECTION =
      "SELECT new com.aksiyoncuk.job.application.repository.JobApplicationRow("
          + "a.id,a.status,a.coverLetter,a.appliedAt,a.updatedAt,a.withdrawnAt,a.reviewedAt,"
          + "j.id,j.title,j.status,o.id,o.username,o.fullName,op.professionalTitle,"
          + "u.id,u.username,u.fullName,up.professionalTitle) "
          + "FROM JobApplication a JOIN a.job j JOIN j.owner o JOIN a.applicant u "
          + "JOIN Profile op ON op.user=o JOIN Profile up ON up.user=u ";

  boolean existsByJobIdAndApplicantId(UUID jobId, UUID applicantId);

  Optional<JobApplication> findByJobIdAndApplicantId(UUID jobId, UUID applicantId);

  long countByJobId(UUID jobId);

  long countByApplicantId(UUID applicantId);

  @Query(
      value = PROJECTION + "WHERE u.id=:applicantId AND (:status IS NULL OR a.status=:status)",
      countQuery =
          "SELECT count(a) FROM JobApplication a WHERE a.applicant.id=:applicantId "
              + "AND (:status IS NULL OR a.status=:status)")
  Page<JobApplicationRow> findApplicantProjected(
      @Param("applicantId") UUID applicantId,
      @Param("status") JobApplicationStatus status,
      Pageable pageable);

  @Query(
      value = PROJECTION + "WHERE j.id=:jobId AND (:status IS NULL OR a.status=:status)",
      countQuery =
          "SELECT count(a) FROM JobApplication a WHERE a.job.id=:jobId "
              + "AND (:status IS NULL OR a.status=:status)")
  Page<JobApplicationRow> findJobProjected(
      @Param("jobId") UUID jobId, @Param("status") JobApplicationStatus status, Pageable pageable);

  @Query(PROJECTION + "WHERE a.id=:id")
  Optional<JobApplicationRow> findProjectedById(@Param("id") UUID id);
}

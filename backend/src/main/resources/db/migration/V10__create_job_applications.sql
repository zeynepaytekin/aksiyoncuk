CREATE TABLE job_applications (
    id UUID PRIMARY KEY,
    job_id UUID NOT NULL,
    applicant_id UUID NOT NULL,
    cover_letter VARCHAR(5000),
    status VARCHAR(30) NOT NULL,
    applied_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    withdrawn_at TIMESTAMP WITH TIME ZONE,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by_user_id UUID,
    CONSTRAINT fk_job_applications_job FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
    CONSTRAINT fk_job_applications_applicant FOREIGN KEY (applicant_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_job_applications_reviewer FOREIGN KEY (reviewed_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT uq_job_applications_job_applicant UNIQUE (job_id, applicant_id),
    CONSTRAINT chk_job_applications_status CHECK (status IN ('SUBMITTED', 'ACCEPTED', 'REJECTED', 'WITHDRAWN')),
    CONSTRAINT chk_job_applications_cover_letter CHECK (
        cover_letter IS NULL OR (length(btrim(cover_letter)) BETWEEN 1 AND 5000)
    ),
    CONSTRAINT chk_job_applications_timestamps CHECK (
        (status = 'SUBMITTED' AND withdrawn_at IS NULL AND reviewed_at IS NULL)
        OR (status = 'WITHDRAWN' AND withdrawn_at IS NOT NULL AND reviewed_at IS NULL)
        OR (status IN ('ACCEPTED', 'REJECTED') AND withdrawn_at IS NULL AND reviewed_at IS NOT NULL)
    )
);

CREATE INDEX idx_job_applications_applicant_applied
    ON job_applications(applicant_id, applied_at DESC, id DESC);
CREATE INDEX idx_job_applications_job_applied
    ON job_applications(job_id, applied_at DESC, id DESC);
CREATE INDEX idx_job_applications_job_status_applied
    ON job_applications(job_id, status, applied_at DESC);

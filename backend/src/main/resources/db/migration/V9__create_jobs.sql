CREATE TABLE jobs (
    id UUID PRIMARY KEY,
    owner_id UUID NOT NULL,
    title VARCHAR(200) NOT NULL,
    description VARCHAR(5000) NOT NULL,
    category VARCHAR(30) NOT NULL,
    work_mode VARCHAR(20) NOT NULL,
    location VARCHAR(150),
    compensation_type VARCHAR(30) NOT NULL,
    compensation_amount NUMERIC(14,2),
    currency VARCHAR(3),
    status VARCHAR(20) NOT NULL,
    application_deadline TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_jobs_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT chk_jobs_title CHECK (length(btrim(title)) BETWEEN 1 AND 200),
    CONSTRAINT chk_jobs_description CHECK (length(btrim(description)) BETWEEN 1 AND 5000),
    CONSTRAINT chk_jobs_category CHECK (category IN ('VOLUNTEER', 'STUDENT', 'AMATEUR', 'PROFESSIONAL')),
    CONSTRAINT chk_jobs_work_mode CHECK (work_mode IN ('ONSITE', 'REMOTE', 'HYBRID')),
    CONSTRAINT chk_jobs_compensation_type CHECK (compensation_type IN ('UNPAID', 'FIXED', 'NEGOTIABLE')),
    CONSTRAINT chk_jobs_status CHECK (status IN ('OPEN', 'CLOSED')),
    CONSTRAINT chk_jobs_currency CHECK (currency IS NULL OR currency ~ '^[A-Z]{3}$'),
    CONSTRAINT chk_jobs_compensation CHECK (
        (compensation_type = 'UNPAID' AND compensation_amount IS NULL AND currency IS NULL)
        OR (compensation_type = 'FIXED' AND compensation_amount > 0 AND currency IS NOT NULL)
        OR (compensation_type = 'NEGOTIABLE' AND (compensation_amount IS NULL OR compensation_amount > 0))
    )
);

CREATE INDEX idx_jobs_status_created ON jobs(status, created_at DESC, id DESC);
CREATE INDEX idx_jobs_owner_created ON jobs(owner_id, created_at DESC, id DESC);
CREATE INDEX idx_jobs_category_status_created ON jobs(category, status, created_at DESC);

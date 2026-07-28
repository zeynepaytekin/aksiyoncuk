CREATE TABLE works (
    id UUID PRIMARY KEY,
    owner_id UUID NOT NULL,
    title VARCHAR(200) NOT NULL,
    description VARCHAR(5000),
    work_type VARCHAR(30) NOT NULL,
    project_url VARCHAR(500),
    release_year INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_works_owner
        FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT chk_works_title_trimmed_nonblank
        CHECK (title = btrim(title) AND length(title) BETWEEN 1 AND 200),
    CONSTRAINT chk_works_description_length
        CHECK (description IS NULL OR length(description) <= 5000),
    CONSTRAINT chk_works_project_url_length
        CHECK (project_url IS NULL OR length(project_url) <= 500),
    CONSTRAINT chk_works_type
        CHECK (work_type IN (
            'FILM', 'SHORT_FILM', 'DOCUMENTARY', 'SERIES', 'COMMERCIAL',
            'MUSIC_VIDEO', 'PHOTOGRAPHY', 'THEATRE', 'OTHER'
        )),
    CONSTRAINT chk_works_release_year
        CHECK (release_year IS NULL OR release_year BETWEEN 1888 AND 9999)
);

CREATE INDEX idx_works_owner_created
    ON works (owner_id, created_at DESC, id DESC);

CREATE INDEX idx_works_type_created
    ON works (work_type, created_at DESC);

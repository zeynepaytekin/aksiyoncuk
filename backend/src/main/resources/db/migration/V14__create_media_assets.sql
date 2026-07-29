CREATE TABLE media_assets (
    id UUID PRIMARY KEY,
    owner_user_id UUID,
    storage_key VARCHAR(500) NOT NULL,
    original_filename VARCHAR(255),
    content_type VARCHAR(100) NOT NULL,
    size_bytes BIGINT NOT NULL,
    media_kind VARCHAR(30) NOT NULL,
    usage_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT uk_media_assets_storage_key UNIQUE (storage_key),
    CONSTRAINT fk_media_assets_owner FOREIGN KEY (owner_user_id)
        REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT ck_media_assets_size_positive CHECK (size_bytes > 0),
    CONSTRAINT ck_media_assets_kind CHECK (media_kind IN ('IMAGE')),
    CONSTRAINT ck_media_assets_usage CHECK (usage_type IN (
        'PROFILE_AVATAR', 'PROFILE_COVER', 'POST_IMAGE', 'WORK_IMAGE'
    )),
    CONSTRAINT ck_media_assets_status CHECK (status IN ('ACTIVE', 'DELETED'))
);

CREATE INDEX idx_media_assets_owner_created
    ON media_assets (owner_user_id, created_at DESC);
CREATE INDEX idx_media_assets_usage_created
    ON media_assets (usage_type, created_at DESC);
CREATE INDEX idx_media_assets_status_created
    ON media_assets (status, created_at DESC);

ALTER TABLE profiles
    ADD COLUMN avatar_media_id UUID,
    ADD COLUMN cover_media_id UUID,
    ADD CONSTRAINT fk_profiles_avatar_media FOREIGN KEY (avatar_media_id)
        REFERENCES media_assets (id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_profiles_cover_media FOREIGN KEY (cover_media_id)
        REFERENCES media_assets (id) ON DELETE SET NULL;

CREATE TABLE post_media (
    id UUID PRIMARY KEY,
    post_id UUID NOT NULL,
    media_asset_id UUID NOT NULL,
    display_order INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_post_media_post FOREIGN KEY (post_id)
        REFERENCES posts (id) ON DELETE CASCADE,
    CONSTRAINT fk_post_media_asset FOREIGN KEY (media_asset_id)
        REFERENCES media_assets (id),
    CONSTRAINT uk_post_media_asset UNIQUE (post_id, media_asset_id),
    CONSTRAINT uk_post_media_order UNIQUE (post_id, display_order)
);

CREATE TABLE work_media (
    id UUID PRIMARY KEY,
    work_id UUID NOT NULL,
    media_asset_id UUID NOT NULL,
    display_order INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_work_media_work FOREIGN KEY (work_id)
        REFERENCES works (id) ON DELETE CASCADE,
    CONSTRAINT fk_work_media_asset FOREIGN KEY (media_asset_id)
        REFERENCES media_assets (id),
    CONSTRAINT uk_work_media_asset UNIQUE (work_id, media_asset_id),
    CONSTRAINT uk_work_media_order UNIQUE (work_id, display_order)
);

CREATE INDEX idx_post_media_order ON post_media (post_id, display_order, id);
CREATE INDEX idx_work_media_order ON work_media (work_id, display_order, id);

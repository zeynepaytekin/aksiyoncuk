ALTER TABLE media_assets DROP CONSTRAINT ck_media_assets_usage;
ALTER TABLE media_assets ADD CONSTRAINT ck_media_assets_usage CHECK (usage_type IN (
    'PROFILE_AVATAR', 'PROFILE_COVER', 'POST_IMAGE', 'WORK_IMAGE', 'FREELANCE_SERVICE_IMAGE'
));

ALTER TABLE notifications DROP CONSTRAINT chk_notifications_type;
ALTER TABLE notifications ADD CONSTRAINT chk_notifications_type CHECK (notification_type IN (
    'USER_FOLLOWED', 'POST_LIKED', 'POST_COMMENTED', 'JOB_APPLICATION_RECEIVED',
    'JOB_APPLICATION_ACCEPTED', 'JOB_APPLICATION_REJECTED',
    'FREELANCE_ORDER_CREATED', 'FREELANCE_ORDER_STARTED', 'FREELANCE_ORDER_REJECTED',
    'FREELANCE_ORDER_DELIVERED', 'FREELANCE_REVISION_REQUESTED',
    'FREELANCE_REVISION_ACKNOWLEDGED', 'FREELANCE_ORDER_COMPLETED',
    'FREELANCE_CANCELLATION_REQUESTED', 'FREELANCE_CANCELLATION_ACCEPTED',
    'FREELANCE_CANCELLATION_REJECTED', 'FREELANCE_REVIEW_RECEIVED'
));
ALTER TABLE notifications DROP CONSTRAINT chk_notifications_entity_type;
ALTER TABLE notifications ADD CONSTRAINT chk_notifications_entity_type CHECK (
    entity_type IS NULL OR entity_type IN (
        'USER', 'POST', 'JOB', 'JOB_APPLICATION', 'FREELANCE_SERVICE', 'FREELANCE_ORDER'
    )
);

CREATE TABLE freelance_categories (
    id UUID PRIMARY KEY,
    parent_id UUID NULL REFERENCES freelance_categories(id) ON DELETE RESTRICT,
    slug VARCHAR(80) NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL,
    description VARCHAR(500) NULL,
    display_order INTEGER NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_freelance_category_not_self CHECK (parent_id IS NULL OR parent_id <> id)
);
CREATE UNIQUE INDEX uk_freelance_category_sibling_name
    ON freelance_categories (COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name));
CREATE INDEX idx_freelance_category_active_order
    ON freelance_categories (active, display_order, id);

INSERT INTO freelance_categories (id, slug, name, display_order) VALUES
('10000000-0000-0000-0000-000000000001', 'grafik-ve-tasarim', 'Grafik ve Tasarım', 10),
('10000000-0000-0000-0000-000000000002', 'video-ve-animasyon', 'Video ve Animasyon', 20),
('10000000-0000-0000-0000-000000000003', 'yazilim-ve-teknoloji', 'Yazılım ve Teknoloji', 30),
('10000000-0000-0000-0000-000000000004', 'yazi-ve-ceviri', 'Yazı ve Çeviri', 40),
('10000000-0000-0000-0000-000000000005', 'muzik-ve-ses', 'Müzik ve Ses', 50),
('10000000-0000-0000-0000-000000000006', 'dijital-pazarlama', 'Dijital Pazarlama', 60),
('10000000-0000-0000-0000-000000000007', 'fotograf', 'Fotoğraf', 70),
('10000000-0000-0000-0000-000000000008', 'oyunculuk-ve-sahne-sanatlari', 'Oyunculuk ve Sahne Sanatları', 80),
('10000000-0000-0000-0000-000000000009', 'film-ve-produksiyon', 'Film ve Prodüksiyon', 90)
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE freelance_services (
    id UUID PRIMARY KEY,
    seller_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    category_id UUID NOT NULL REFERENCES freelance_categories(id) ON DELETE RESTRICT,
    title VARCHAR(120) NOT NULL,
    slug VARCHAR(140) NOT NULL,
    short_description VARCHAR(300) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    language_code VARCHAR(10) NULL,
    average_rating NUMERIC(3,2) NULL,
    review_count INTEGER NOT NULL DEFAULT 0,
    order_count INTEGER NOT NULL DEFAULT 0,
    published_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT uk_freelance_service_seller_slug UNIQUE (seller_user_id, slug),
    CONSTRAINT ck_freelance_service_status CHECK (status IN ('DRAFT','PUBLISHED','PAUSED','ARCHIVED')),
    CONSTRAINT ck_freelance_service_lengths CHECK (
        char_length(btrim(title)) BETWEEN 10 AND 120
        AND char_length(btrim(short_description)) BETWEEN 20 AND 300
        AND char_length(btrim(description)) BETWEEN 50 AND 10000
    ),
    CONSTRAINT ck_freelance_service_aggregates CHECK (
        review_count >= 0 AND order_count >= 0
        AND (average_rating IS NULL OR average_rating BETWEEN 1 AND 5)
    )
);
CREATE INDEX idx_freelance_services_seller ON freelance_services (seller_user_id, status, updated_at DESC);
CREATE INDEX idx_freelance_services_category ON freelance_services (category_id, status, published_at DESC);
CREATE INDEX idx_freelance_services_rating ON freelance_services (status, average_rating DESC, id);
CREATE INDEX idx_freelance_services_title ON freelance_services (lower(title));

CREATE TABLE freelance_service_packages (
    id UUID PRIMARY KEY,
    service_id UUID NOT NULL REFERENCES freelance_services(id) ON DELETE CASCADE,
    tier VARCHAR(20) NOT NULL,
    name VARCHAR(80) NOT NULL,
    description TEXT NOT NULL,
    price_amount NUMERIC(19,2) NOT NULL,
    currency_code CHAR(3) NOT NULL,
    delivery_days INTEGER NOT NULL,
    revision_count INTEGER NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT uk_freelance_package_tier UNIQUE (service_id, tier),
    CONSTRAINT uk_freelance_package_order UNIQUE (service_id, display_order),
    CONSTRAINT ck_freelance_package_tier CHECK (tier IN ('BASIC','STANDARD','PREMIUM')),
    CONSTRAINT ck_freelance_package_price CHECK (price_amount > 0),
    CONSTRAINT ck_freelance_package_currency CHECK (currency_code = 'TRY'),
    CONSTRAINT ck_freelance_package_delivery CHECK (delivery_days BETWEEN 1 AND 365),
    CONSTRAINT ck_freelance_package_revisions CHECK (revision_count BETWEEN 0 AND 100),
    CONSTRAINT ck_freelance_package_text CHECK (
        char_length(btrim(name)) BETWEEN 1 AND 80
        AND char_length(btrim(description)) BETWEEN 1 AND 2000
    )
);

CREATE TABLE freelance_service_works (
    id UUID PRIMARY KEY,
    service_id UUID NOT NULL REFERENCES freelance_services(id) ON DELETE CASCADE,
    work_id UUID NOT NULL REFERENCES works(id) ON DELETE CASCADE,
    display_order INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_freelance_service_work UNIQUE (service_id, work_id),
    CONSTRAINT uk_freelance_service_work_order UNIQUE (service_id, display_order)
);

CREATE TABLE freelance_service_media (
    id UUID PRIMARY KEY,
    service_id UUID NOT NULL REFERENCES freelance_services(id) ON DELETE CASCADE,
    media_asset_id UUID NOT NULL REFERENCES media_assets(id) ON DELETE RESTRICT,
    display_order INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_freelance_service_media UNIQUE (service_id, media_asset_id),
    CONSTRAINT uk_freelance_service_media_order UNIQUE (service_id, display_order)
);

CREATE TABLE freelance_orders (
    id UUID PRIMARY KEY,
    service_id UUID NOT NULL REFERENCES freelance_services(id) ON DELETE RESTRICT,
    package_id UUID NULL REFERENCES freelance_service_packages(id) ON DELETE SET NULL,
    buyer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    seller_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    order_number VARCHAR(32) NOT NULL UNIQUE,
    status VARCHAR(30) NOT NULL,
    package_tier VARCHAR(20) NOT NULL,
    package_name VARCHAR(80) NOT NULL,
    package_description TEXT NOT NULL,
    price_amount NUMERIC(19,2) NOT NULL,
    currency_code CHAR(3) NOT NULL,
    delivery_days INTEGER NOT NULL,
    included_revision_count INTEGER NOT NULL,
    used_revision_count INTEGER NOT NULL DEFAULT 0,
    buyer_requirements TEXT NOT NULL,
    started_at TIMESTAMPTZ NULL,
    delivery_due_at TIMESTAMPTZ NULL,
    delivered_at TIMESTAMPTZ NULL,
    completed_at TIMESTAMPTZ NULL,
    cancelled_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT ck_freelance_order_parties CHECK (buyer_user_id <> seller_user_id),
    CONSTRAINT ck_freelance_order_status CHECK (status IN (
        'CREATED','IN_PROGRESS','DELIVERED','REVISION_REQUESTED','COMPLETED',
        'CANCELLATION_REQUESTED','CANCELLED'
    )),
    CONSTRAINT ck_freelance_order_snapshot CHECK (
        price_amount > 0 AND currency_code = 'TRY' AND delivery_days BETWEEN 1 AND 365
        AND included_revision_count BETWEEN 0 AND 100
        AND used_revision_count BETWEEN 0 AND included_revision_count
    ),
    CONSTRAINT ck_freelance_order_requirements CHECK (
        char_length(btrim(buyer_requirements)) BETWEEN 10 AND 5000
    )
);
CREATE INDEX idx_freelance_orders_buyer ON freelance_orders (buyer_user_id, status, updated_at DESC, id);
CREATE INDEX idx_freelance_orders_seller ON freelance_orders (seller_user_id, status, updated_at DESC, id);
CREATE INDEX idx_freelance_orders_service ON freelance_orders (service_id, created_at DESC);
CREATE INDEX idx_freelance_orders_due ON freelance_orders (delivery_due_at)
    WHERE status IN ('IN_PROGRESS','REVISION_REQUESTED');

CREATE TABLE freelance_order_deliveries (
    id UUID PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES freelance_orders(id) ON DELETE CASCADE,
    submitted_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_freelance_delivery_message CHECK (char_length(btrim(message)) BETWEEN 10 AND 5000)
);
CREATE INDEX idx_freelance_deliveries_order ON freelance_order_deliveries (order_id, created_at DESC, id);

CREATE TABLE freelance_order_revision_requests (
    id UUID PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES freelance_orders(id) ON DELETE CASCADE,
    requested_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    reason TEXT NOT NULL,
    sequence_number INTEGER NOT NULL,
    acknowledged_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_freelance_revision_sequence UNIQUE (order_id, sequence_number),
    CONSTRAINT ck_freelance_revision_reason CHECK (char_length(btrim(reason)) BETWEEN 10 AND 2000)
);

CREATE TABLE freelance_order_cancellation_requests (
    id UUID PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES freelance_orders(id) ON DELETE CASCADE,
    requested_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    requested_role VARCHAR(10) NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(20) NOT NULL,
    previous_order_status VARCHAR(30) NOT NULL,
    resolved_by_user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    resolution_note TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMPTZ NULL,
    CONSTRAINT ck_freelance_cancel_role CHECK (requested_role IN ('BUYER','SELLER')),
    CONSTRAINT ck_freelance_cancel_status CHECK (status IN ('PENDING','ACCEPTED','REJECTED','WITHDRAWN')),
    CONSTRAINT ck_freelance_cancel_previous CHECK (previous_order_status IN ('CREATED','IN_PROGRESS','DELIVERED','REVISION_REQUESTED')),
    CONSTRAINT ck_freelance_cancel_reason CHECK (char_length(btrim(reason)) BETWEEN 10 AND 2000)
);
CREATE UNIQUE INDEX uk_freelance_cancel_pending
    ON freelance_order_cancellation_requests(order_id) WHERE status = 'PENDING';

CREATE TABLE freelance_reviews (
    id UUID PRIMARY KEY,
    order_id UUID NOT NULL UNIQUE REFERENCES freelance_orders(id) ON DELETE RESTRICT,
    service_id UUID NOT NULL REFERENCES freelance_services(id) ON DELETE RESTRICT,
    reviewer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    reviewed_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    rating SMALLINT NOT NULL,
    comment TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT ck_freelance_review_rating CHECK (rating BETWEEN 1 AND 5),
    CONSTRAINT ck_freelance_review_not_self CHECK (reviewer_user_id <> reviewed_user_id),
    CONSTRAINT ck_freelance_review_comment CHECK (
        comment IS NULL OR char_length(btrim(comment)) BETWEEN 1 AND 2000
    )
);
CREATE INDEX idx_freelance_reviews_service ON freelance_reviews(service_id, created_at DESC, id);

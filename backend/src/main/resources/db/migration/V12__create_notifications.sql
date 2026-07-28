CREATE TABLE notifications (
    id UUID PRIMARY KEY,
    recipient_id UUID NOT NULL,
    actor_id UUID NULL,
    notification_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NULL,
    entity_id UUID NULL,
    event_key VARCHAR(200) NOT NULL,
    message VARCHAR(500) NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_notifications_recipient
        FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_notifications_actor
        FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT uq_notifications_event_key UNIQUE (event_key),
    CONSTRAINT chk_notifications_type CHECK (
        notification_type IN (
            'USER_FOLLOWED',
            'POST_LIKED',
            'POST_COMMENTED',
            'JOB_APPLICATION_RECEIVED',
            'JOB_APPLICATION_ACCEPTED',
            'JOB_APPLICATION_REJECTED'
        )
    ),
    CONSTRAINT chk_notifications_entity_type CHECK (
        entity_type IS NULL OR entity_type IN ('USER', 'POST', 'JOB', 'JOB_APPLICATION')
    ),
    CONSTRAINT chk_notifications_message CHECK (
        message = BTRIM(message) AND LENGTH(message) BETWEEN 1 AND 500
    )
);

CREATE INDEX idx_notifications_recipient_created
    ON notifications (recipient_id, created_at DESC, id DESC);

CREATE INDEX idx_notifications_recipient_read_created
    ON notifications (recipient_id, read_at, created_at DESC);

CREATE INDEX idx_notifications_entity
    ON notifications (entity_type, entity_id);

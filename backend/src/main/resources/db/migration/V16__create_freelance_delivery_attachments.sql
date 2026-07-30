ALTER TABLE freelance_order_deliveries
    ADD CONSTRAINT uq_freelance_delivery_order UNIQUE (id, order_id);

CREATE TABLE freelance_delivery_attachments (
    id UUID PRIMARY KEY,
    delivery_id UUID NOT NULL,
    order_id UUID NOT NULL,
    storage_key VARCHAR(700) NOT NULL UNIQUE,
    original_filename VARCHAR(200) NOT NULL,
    sanitized_filename VARCHAR(200) NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    size_bytes BIGINT NOT NULL CHECK (size_bytes > 0),
    display_order SMALLINT NOT NULL CHECK (display_order BETWEEN 0 AND 4),
    created_at TIMESTAMPTZ NOT NULL DEFAULT current_timestamp,
    CONSTRAINT fk_freelance_attachment_delivery_order
        FOREIGN KEY (delivery_id, order_id)
        REFERENCES freelance_order_deliveries(id, order_id)
        ON DELETE CASCADE,
    CONSTRAINT uq_freelance_attachment_order UNIQUE (delivery_id, display_order)
);

CREATE INDEX idx_freelance_delivery_attachments_order
    ON freelance_delivery_attachments(order_id, delivery_id, display_order);

CREATE TABLE conversations (
    id UUID PRIMARY KEY,
    conversation_type VARCHAR(20) NOT NULL,
    direct_key VARCHAR(100) NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT chk_conversations_type CHECK (conversation_type = 'DIRECT'),
    CONSTRAINT chk_conversations_direct_key CHECK (
        conversation_type <> 'DIRECT' OR direct_key IS NOT NULL
    ),
    CONSTRAINT uq_conversations_direct_key UNIQUE (direct_key)
);

CREATE TABLE conversation_participants (
    id UUID PRIMARY KEY,
    conversation_id UUID NOT NULL,
    user_id UUID NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_read_at TIMESTAMP WITH TIME ZONE NULL,
    CONSTRAINT fk_conversation_participants_conversation
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    CONSTRAINT fk_conversation_participants_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uq_conversation_participants_conversation_user
        UNIQUE (conversation_id, user_id)
);

CREATE TABLE messages (
    id UUID PRIMARY KEY,
    conversation_id UUID NOT NULL,
    sender_id UUID NULL,
    content VARCHAR(5000) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_messages_conversation
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    CONSTRAINT fk_messages_sender
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT chk_messages_content CHECK (
        content = BTRIM(content) AND LENGTH(content) BETWEEN 1 AND 5000
    )
);

CREATE INDEX idx_conversation_participants_user_joined
    ON conversation_participants (user_id, joined_at DESC);
CREATE INDEX idx_messages_conversation_created
    ON messages (conversation_id, created_at DESC, id DESC);
CREATE INDEX idx_messages_sender_created
    ON messages (sender_id, created_at DESC);
CREATE INDEX idx_conversations_updated
    ON conversations (updated_at DESC, id DESC);

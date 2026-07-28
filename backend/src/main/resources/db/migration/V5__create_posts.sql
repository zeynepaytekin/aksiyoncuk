CREATE TABLE posts (
  id UUID PRIMARY KEY,
  author_id UUID NOT NULL,
  content VARCHAR(3000) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  CONSTRAINT fk_posts_author
    FOREIGN KEY (author_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT ck_posts_content_not_blank CHECK (length(btrim(content)) > 0),
  CONSTRAINT ck_posts_content_length CHECK (char_length(content) <= 3000)
);

CREATE INDEX idx_posts_created_at_id_desc ON posts (created_at DESC, id DESC);
CREATE INDEX idx_posts_author_created_at_id_desc
  ON posts (author_id, created_at DESC, id DESC);

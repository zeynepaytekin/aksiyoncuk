CREATE TABLE post_comments (
  id UUID PRIMARY KEY,
  post_id UUID NOT NULL,
  author_id UUID NOT NULL,
  content VARCHAR(2000) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  CONSTRAINT fk_post_comments_post
    FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE,
  CONSTRAINT fk_post_comments_author
    FOREIGN KEY (author_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT ck_post_comments_content_not_blank CHECK (length(btrim(content)) > 0),
  CONSTRAINT ck_post_comments_content_length CHECK (char_length(content) <= 2000)
);

CREATE INDEX idx_post_comments_post_created_at_id_asc
  ON post_comments (post_id, created_at ASC, id ASC);
CREATE INDEX idx_post_comments_author_created_at_desc
  ON post_comments (author_id, created_at DESC);

CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(254) NOT NULL,
  username VARCHAR(30) NOT NULL,
  password_hash VARCHAR(60) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  CONSTRAINT uk_users_email UNIQUE (email),
  CONSTRAINT uk_users_username UNIQUE (username),
  CONSTRAINT ck_users_email_lowercase CHECK (email = lower(email)),
  CONSTRAINT ck_users_username_lowercase CHECK (username = lower(username))
);

CREATE INDEX idx_users_status ON users (status);

CREATE TABLE profiles (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  professional_title VARCHAR(100),
  bio VARCHAR(2000),
  location VARCHAR(100),
  website_url VARCHAR(2048),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  CONSTRAINT uk_profiles_user_id UNIQUE (user_id),
  CONSTRAINT fk_profiles_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

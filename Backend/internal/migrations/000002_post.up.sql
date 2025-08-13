CREATE TABLE post (
    id            uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    description   TEXT NOT NULL,
    file          VARCHAR(255),
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Create an index on the 'id' column in the 'post' table (redundant)
CREATE INDEX idx_post_id ON post(id);
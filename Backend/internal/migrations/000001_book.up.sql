CREATE TABLE book (
    id          uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    file        VARCHAR(255),
    year        INTEGER NOT NULL,
    degree int,
    season      VARCHAR(10) CHECK (season IN ('spring', 'fall')) NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_book_name ON book USING gin (to_tsvector('english', name));
CREATE INDEX idx_book_description ON book USING gin (to_tsvector('english', description));

-- 3. B-tree indexes for additional performance
CREATE INDEX idx_book_name_btree ON book (name);
CREATE INDEX idx_book_year ON book (year);

-- 4. Additional optimization for UUID column
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE INDEX idx_book_id_hash ON book USING hash (id);

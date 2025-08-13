CREATE TABLE book_discussants (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id uuid NOT NULL REFERENCES book(id) ON DELETE CASCADE,
    discussant_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE
);

-- Create an index on the 'book_id' column in the 'book_discussants' table
CREATE INDEX idx_book_discussants_book_id ON book_discussants(book_id);

-- Create an index on the 'discussant_id' column in the 'book_discussants' table
CREATE INDEX idx_book_discussants_discussant_id ON book_discussants(discussant_id);
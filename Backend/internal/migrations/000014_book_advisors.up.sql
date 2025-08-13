CREATE TABLE book_advisors (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id uuid NOT NULL REFERENCES book(id) ON DELETE CASCADE,
    advisor_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_book_advisors_book_id ON book_advisors(book_id);

-- Create an index on the 'advisor_id' column in the 'book_advisors' table
CREATE INDEX idx_book_advisors_advisor_id ON book_advisors(advisor_id);

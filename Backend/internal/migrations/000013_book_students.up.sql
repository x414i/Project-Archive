CREATE TABLE book_students (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id uuid NOT NULL REFERENCES book(id) ON DELETE CASCADE,
    student_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_book_students_book_id ON book_students(book_id);

-- Create an index on the 'student_id' column in the 'book_students' table
CREATE INDEX idx_book_students_student_id ON book_students(student_id);

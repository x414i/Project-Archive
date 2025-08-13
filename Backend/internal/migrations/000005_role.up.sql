CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);
INSERT INTO roles (id, name)
VALUES
    (1, 'admin'),
    (2, 'teacher'),
    (3, 'student'),
    (4, 'graduation_student'),
    (5, 'graduated_student')

ON CONFLICT (id) DO NOTHING;
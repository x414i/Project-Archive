CREATE TABLE pre_project_students (
    pre_project_id uuid NOT NULL,
    student_id uuid NOT NULL,
    PRIMARY KEY (pre_project_id, student_id),
    FOREIGN KEY (pre_project_id) REFERENCES pre_project(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);

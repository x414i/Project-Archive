    CREATE TABLE pre_project_discussants (

    pre_project_id uuid NOT NULL,
        discussant_id  uuid NOT NULL,
        PRIMARY KEY (pre_project_id, discussant_id),
        FOREIGN KEY (pre_project_id) REFERENCES pre_project(id) ON DELETE CASCADE,
        FOREIGN KEY (discussant_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Create an index on the 'book_id' column in the 'book_discussants' table
    CREATE INDEX idx_pre_project_id_discussants_book_id ON pre_project_discussants(pre_project_id);

    -- Create an index on the 'discussant_id' column in the 'book_discussants' table
    CREATE INDEX idx_pre_project_id_discussants_discussant_id ON pre_project_discussants(discussant_id);
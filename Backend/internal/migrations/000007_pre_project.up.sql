-- Pre-project table to store student projects and their associated advisors
CREATE TABLE pre_project (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    file_description Text,
    file VARCHAR(255),
    project_owner uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    accepted_advisor uuid  REFERENCES users(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    season VARCHAR(10) CHECK (season IN ('spring', 'fall')) NOT NULL,
    can_update bool default true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE pre_project
ADD COLUMN degree int;

-- Create an index on the 'project_owner' column in the 'pre_project' table
CREATE INDEX idx_pre_project_project_owner ON pre_project(project_owner);

-- Create an index on the 'accepted_advisor' column in the 'pre_project' table
CREATE INDEX idx_pre_project_accepted_advisor ON pre_project(accepted_advisor);

-- Create an index on the 'year' column in the 'pre_project' table
CREATE INDEX idx_pre_project_year ON pre_project(year);

-- Create an index on the 'season' column in the 'pre_project' table
CREATE INDEX idx_pre_project_season ON pre_project(season);
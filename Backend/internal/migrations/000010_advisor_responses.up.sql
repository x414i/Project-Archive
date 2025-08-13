CREATE TABLE advisor_responses (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    pre_project_id uuid NOT NULL REFERENCES pre_project(id) ON DELETE CASCADE,
    advisor_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) CHECK (status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (pre_project_id, advisor_id) -- Ensures one response per advisor per project
);

CREATE INDEX idx_advisor_responses_pre_project_id ON advisor_responses(pre_project_id);

-- Create an index on the 'advisor_id' column in the 'advisor_responses' table
CREATE INDEX idx_advisor_responses_advisor_id ON advisor_responses(advisor_id);
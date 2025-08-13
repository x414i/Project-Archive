CREATE TABLE users (
    id                        uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    name                      VARCHAR(100) NOT NULL,
    email                     VARCHAR(100) NOT NULL UNIQUE,
    password                  VARCHAR(255) NOT NULL,
    image                     VARCHAR(255),
    verified                    BOOLEAN DEFAULT FALSE,
    created_at                TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at                TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    verification_code         VARCHAR(7),                   
    verification_code_expiry  TIMESTAMP WITH TIME ZONE,       
    last_verification_code_sent TIMESTAMP WITH TIME ZONE      
);

CREATE INDEX idx_users_name ON users(name);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_id ON users(id);

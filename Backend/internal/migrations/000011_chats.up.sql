CREATE TABLE chats (
    id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL,
    receiver_id UUID NOT NULL,
    message TEXT,
    file VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    conversation_id UUID NOT NULL DEFAULT gen_random_uuid(),
    CONSTRAINT fk_sender FOREIGN KEY(sender_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_receiver FOREIGN KEY(receiver_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_conversation FOREIGN KEY(conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);
CREATE INDEX idx_chats_sender_id ON chats(sender_id);

-- Create an index on the 'receiver_id' column in the 'chats' table
CREATE INDEX idx_chats_receiver_id ON chats(receiver_id);

-- Create an index on the 'conversation_id' column in the 'chats' table
CREATE INDEX idx_chats_conversation_id ON chats(conversation_id);
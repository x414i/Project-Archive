package data

import (
	"database/sql"
	"errors"
	"fmt"
	"net/url"
	"project/utils"
	"project/utils/validator"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// Chat represents a chat message in the database
type Chat struct {
	ID             uuid.UUID `db:"id" json:"id"`
	SenderID       uuid.UUID `db:"sender_id" json:"sender_id"`
	ReceiverID     uuid.UUID `db:"receiver_id" json:"receiver_id"`
	ConversationID uuid.UUID `db:"conversation_id" json:"conversation_id"`
	Message        *string   `db:"message" json:"message,omitempty"`
	File           *string   `db:"file" json:"file,omitempty"`
	CreatedAt      time.Time `db:"created_at" json:"created_at"`
}

// ChatWithUsers represents a chat message along with sender and receiver information
type ChatWithUsers struct {
	ChatID        uuid.UUID `db:"chat_id" json:"chat_id"` // This should match the alias in the query
	SenderID      uuid.UUID `db:"sender_id" json:"sender_id"`
	ReceiverID    uuid.UUID `db:"receiver_id" json:"receiver_id"`
	Message       *string   `db:"message" json:"message,omitempty"`
	File          *string   `db:"file" json:"file,omitempty"`
	CreatedAt     time.Time `db:"created_at" json:"created_at"`
	SenderName    string    `db:"sender_name" json:"sender_name"`
	SenderEmail   string    `db:"sender_email" json:"sender_email"`
	ReceiverName  string    `db:"receiver_name" json:"receiver_name"`
	ReceiverEmail string    `db:"receiver_email" json:"receiver_email"`
}

// ChatDB handles database operations related to chats
type ChatDB struct {
	db *sqlx.DB
}

func ValidateChat(v *validator.Validator, chat *Chat, fields ...string) {

	if (chat.Message == nil || *chat.Message == "") && (chat.File == nil || *chat.File == "") {
		v.AddError("chat", "A message or a file must be sent")
	}
}

// InsertChat inserts a new chat message into the database
func (c *ChatDB) InsertChat(chat *Chat) error {
	query, args, err := QB.Insert("chats").
		Columns("sender_id", "receiver_id", "conversation_id", "message", "file").
		Values(chat.SenderID, chat.ReceiverID, chat.ConversationID, chat.Message, chat.File).
		Suffix("RETURNING id, created_at").
		ToSql()
	if err != nil {
		return err
	}

	err = c.db.QueryRowx(query, args...).StructScan(chat)
	return err
}

// GetChatsByConversationID retrieves chat messages for a specific conversation
func (c *ChatDB) GetChatsByConversationID(conversationID uuid.UUID, queryParams url.Values) ([]ChatWithUsers, *utils.Meta, error) {
	var chats []ChatWithUsers
	joins := []string{
		"users AS sender ON chats.sender_id = sender.id",
		"users AS receiver ON chats.receiver_id = receiver.id",
	}
	columns := []string{"chats.id AS chat_id", "chats.sender_id", "chats.receiver_id", "chats.message", "chats.file", "chats.created_at",
		"sender.name AS sender_name", "sender.email AS sender_email", "receiver.name AS receiver_name", "receiver.email AS receiver_email"}

	// Add additional filters for conversation ID
	additionalFilters := []string{fmt.Sprintf("chats.conversation_id = '%s'", conversationID)}

	meta, err := utils.BuildQuery(&chats, "chats", joins, columns, nil, queryParams, additionalFilters)
	if err != nil {
		return nil, nil, fmt.Errorf("error building query: %v", err)
	}

	return chats, meta, nil
}

// DeleteChat deletes a specific chat message by its ID
func (c *ChatDB) DeleteChat(chatID uuid.UUID) error {
	// Construct the SQL query to delete the chat message by its ID
	query, args, err := QB.Delete("chats").
		Where("id = ?", chatID).
		ToSql()
	if err != nil {
		return err
	}

	// Execute the query
	_, err = c.db.Exec(query, args...)
	return err
}

// GetChatByID retrieves a chat message by its ID
func (c *ChatDB) GetChatByID(chatID uuid.UUID) (*ChatWithUsers, error) {
	var chat ChatWithUsers
	query, args, err := QB.Select(chatColumns...).
		From("chats").
		Join("users AS sender ON chats.sender_id = sender.id").
		Join("users AS receiver ON chats.receiver_id = receiver.id").
		Where("chats.id = ?", chatID).
		ToSql()
	if err != nil {
		return nil, err
	}

	err = c.db.Get(&chat, query, args...)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, err
	}

	return &chat, nil
}

// GetParticipantsByChatID retrieves the user IDs of the participants in a chat
func (c *ChatDB) GetParticipantsByChatID(chatID uuid.UUID) ([]uuid.UUID, error) {
	var participants []uuid.UUID
	query, args, err := QB.Select("sender_id", "receiver_id").
		From("chats").
		Where("id = ?", chatID).
		ToSql()
	if err != nil {
		return nil, err
	}

	// Execute the query and get the sender and receiver IDs
	rows, err := c.db.Queryx(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	// Extract the sender and receiver IDs from the query result
	for rows.Next() {
		var senderID, receiverID uuid.UUID
		if err := rows.Scan(&senderID, &receiverID); err != nil {
			return nil, err
		}
		// Add sender and receiver IDs to the participants list
		participants = append(participants, senderID, receiverID)
	}

	// Check for any error encountered during iteration
	if err := rows.Err(); err != nil {
		return nil, err
	}

	// Return the list of participants (user IDs)
	return participants, nil
}

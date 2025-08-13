package data

import (
	"database/sql"
	"errors"
	"fmt"
	"project/utils"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// ConversationDB handles database operations related to conversations
type ConversationDB struct {
	db *sqlx.DB
}

type Conversation struct {
	ID                uuid.UUID  `db:"id" json:"id"`
	User1ID           uuid.UUID  `db:"user1_id" json:"user1_id"`
	User2ID           uuid.UUID  `db:"user2_id" json:"user2_id"`
	User1Email        string     `db:"user1_email" json:"user1_email"`
	User2Email        string     `db:"user2_email" json:"user2_email"`
	ReceiverName      string     `db:"receiver_name" json:"receiver_name"`
	CreatedAt         time.Time  `db:"created_at" json:"created_at"`
	User1Image        *string    `db:"user1_image" json:"user1_image"`
	User2Image        *string    `db:"user2_image" json:"user2_image"`
	LatestMessageTime *time.Time `db:"latest_message_time" json:"latest_message_time"` // Add this field
}

func (c *ConversationDB) GetConversation(studentID, teacherID uuid.UUID) (uuid.UUID, error) {
	// Ensure consistent ordering of user IDs
	if studentID.String() > teacherID.String() {
		studentID, teacherID = teacherID, studentID
	}

	// Check if conversation exists
	var conversationID uuid.UUID
	query, args, err := QB.Select("id").
		From("conversations").
		Where("user1_id = ? AND user2_id = ?", studentID, teacherID).
		ToSql()
	if err != nil {
		return uuid.Nil, err
	}

	err = c.db.Get(&conversationID, query, args...)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return uuid.Nil, nil // No conversation found
		}
		return uuid.Nil, err
	}

	return conversationID, nil
}

func (c *ConversationDB) CreateConversation(studentID, teacherID uuid.UUID) (uuid.UUID, error) {
	// Ensure consistent ordering of user IDs
	if studentID.String() > teacherID.String() {
		studentID, teacherID = teacherID, studentID
	}

	// Create a new conversation
	var conversationID uuid.UUID
	query, args, err := QB.Insert("conversations").
		Columns("user1_id", "user2_id").
		Values(studentID, teacherID).
		Suffix("RETURNING id").
		ToSql()
	if err != nil {
		return uuid.Nil, err
	}

	err = c.db.QueryRowx(query, args...).Scan(&conversationID)
	return conversationID, err
}

func (u *ConversationDB) GetConversationsByUserID(userID uuid.UUID) ([]Conversation, error) {
	query, args, err := u.buildConversationsQuery(userID)
	if err != nil {
		return nil, err
	}

	var conversations []Conversation
	err = u.db.Select(&conversations, query, args...)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrRecordNotFound
		}
		return nil, err
	}

	return conversations, nil
}

func (u *ConversationDB) buildConversationsQuery(userID uuid.UUID) (string, []interface{}, error) {
	user1ImageColumn := fmt.Sprintf("CASE WHEN NULLIF(u1.image, '') IS NOT NULL THEN FORMAT('%s/%%s', u1.image) ELSE NULL END AS user1_image", Domain)
	user2ImageColumn := fmt.Sprintf("CASE WHEN NULLIF(u2.image, '') IS NOT NULL THEN FORMAT('%s/%%s', u2.image) ELSE NULL END AS user2_image", Domain)

	// Select the latest chat's timestamp and order conversations by that
	query, args, err := QB.Select(
		"c.id", "c.user1_id", "c.user2_id",
		"u1.email AS user1_email", "u2.email AS user2_email",
		"COALESCE(u2.name, u1.name) AS receiver_name", "c.created_at",
		user1ImageColumn,
		user2ImageColumn,
		"MAX(ch.created_at) AS latest_message_time"). // Add latest message timestamp
		From("conversations c").
		Join("users u1 ON c.user1_id = u1.id").
		Join("users u2 ON c.user2_id = u2.id").
		Join("chats ch ON c.id = ch.conversation_id").
		Where("c.user1_id = ? OR c.user2_id = ?", userID, userID).
		GroupBy("c.id", "c.user1_id", "c.user2_id", "u1.email", "u2.email", "u1.name", "u2.name", "c.created_at", "user1_image", "user2_image").
		OrderBy("latest_message_time DESC"). // Order by the latest message timestamp
		ToSql()

	if err != nil {
		return "", nil, err
	}
	return query, args, nil
}

func (c *ConversationDB) DeleteConversation(conversationID uuid.UUID) error {
	// First, delete all chats associated with the conversation
	err := c.DeleteChatsByConversationID(conversationID)
	if err != nil {
		return err
	}

	// Now delete the conversation itself
	query, args, err := QB.Delete("conversations").
		Where("id = ?", conversationID).
		ToSql()
	if err != nil {
		return err
	}

	// Execute the delete query
	result, err := c.db.Exec(query, args...)
	if err != nil {
		return err
	}

	// Check if any rows were affected
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return ErrRecordNotFound
	}

	return nil
}
func (c *ConversationDB) DeleteChatsByConversationID(conversationID uuid.UUID) error {
	// First, retrieve all chats to get the file paths
	var chats []Chat
	query, args, err := QB.Select("file").
		From("chats").
		Where("conversation_id = ?", conversationID).
		ToSql()
	if err != nil {
		return err
	}

	err = c.db.Select(&chats, query, args...)
	if err != nil {
		return err
	}

	// Delete the chats
	query, args, err = QB.Delete("chats").
		Where("conversation_id = ?", conversationID).
		ToSql()
	if err != nil {
		return err
	}

	_, err = c.db.Exec(query, args...)
	if err != nil {
		return err
	}

	// Now delete the files
	for _, chat := range chats {
		if chat.File != nil {
			err := utils.DeleteFile(*chat.File) // Implement this function to delete the file
			if err != nil {
				return err
			}
		}
	}

	return nil
}
func (c *ConversationDB) GetConversationByID(conversationID uuid.UUID) (*Conversation, error) {
	var conversation Conversation
	query, args, err := QB.Select("*").
		From("conversations").
		Where("id = ?", conversationID).
		ToSql()
	if err != nil {
		return nil, err
	}

	err = c.db.Get(&conversation, query, args...)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrRecordNotFound
		}
		return nil, err
	}

	return &conversation, nil
}

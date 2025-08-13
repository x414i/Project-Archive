package main

import (
	"errors"
	"fmt"
	"net/http"
	"project/internal/data"
	"project/utils"
	"project/utils/validator"

	"github.com/google/uuid"
)

func (app *application) CreateChatHandler(w http.ResponseWriter, r *http.Request) {
	senderID := r.Context().Value(UserIDKey).(string)
	receiverEmail := r.FormValue("receiver_email")
	message := r.FormValue("message")

	senderUUID, err := uuid.Parse(senderID)
	if err != nil {
		app.badRequestResponse(w, r, errors.New("invalid sender ID"))
		return
	}

	receiver, err := app.Model.UserDB.GetUserByEmail(receiverEmail)
	if err != nil {
		app.handleRetrievalError(w, r, err)
		return
	}
	receiverUUID := receiver.ID

	// Handle file upload
	var filePath *string
	file, fileHeader, err := r.FormFile("file")
	if err == nil {
		defer file.Close()
		newFileName, err := utils.SaveFile(file, "chats", fileHeader.Filename)
		if err != nil {
			app.errorResponse(w, r, http.StatusBadRequest, "invalid file")
			return
		}
		filePath = &newFileName
	}

	// Create the chat object
	chat := &data.Chat{
		SenderID:   senderUUID,
		ReceiverID: receiverUUID,
		Message:    &message,
		File:       filePath,
	}

	// Create a new validator instance
	v := validator.New()

	// Validate the chat
	data.ValidateChat(v, chat)

	// Check if there are any validation errors
	if !v.Valid() {
		app.errorResponse(w, r, http.StatusBadRequest, v.Errors)
		return
	}

	// Check if a conversation already exists between the sender and receiver
	conversationID, err := app.Model.ConversationDB.GetConversation(senderUUID, receiverUUID)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	// If no conversation exists, create a new one
	if conversationID == uuid.Nil {
		conversationID, err = app.Model.ConversationDB.CreateConversation(senderUUID, receiverUUID)
		if err != nil {
			app.serverErrorResponse(w, r, err)
			return
		}

		// Notify both sender and receiver about the new conversation
		conversationNotification := map[string]interface{}{
			"type":           "new_conversation",
			"conversationID": conversationID,
			"message":        "A new conversation has been created",
		}

		// Send notification to the receiver
		app.wsManager.BroadcastMessage(receiverUUID, conversationNotification)

		// Send notification to the sender
		app.wsManager.BroadcastMessage(senderUUID, conversationNotification)
	}

	// Set the conversation ID in the chat object
	chat.ConversationID = conversationID

	// Insert the chat into the database
	err = app.Model.ChatDB.InsertChat(chat)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	// Prepare notifications for both sender and receiver about the new message
	notification := map[string]interface{}{
		"type":    "new_message",
		"chat":    chat,
		"message": "You have a new message",
	}

	// Send notification to the receiver
	app.wsManager.BroadcastMessage(receiverUUID, notification)

	// Send a successful response
	utils.SendJSONResponse(w, http.StatusCreated, utils.Envelope{"chat": chat})
}
func (app *application) GetChatsHandler(w http.ResponseWriter, r *http.Request) {
	conversationIDStr := r.PathValue("conversation_id")
	conversationID, err := uuid.Parse(conversationIDStr)
	if err != nil {
		app.badRequestResponse(w, r, errors.New("invalid conversation ID"))
		return
	}

	// Extract query parameters from the request
	queryParams := r.URL.Query()

	// Call the GetChatsByConversationID function with the conversation ID and query parameters
	chats, meta, err := app.Model.ChatDB.GetChatsByConversationID(conversationID, queryParams)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}
	fmt.Print("image returned:", chats)

	// Send the response with chats and metadata
	utils.SendJSONResponse(w, http.StatusOK, utils.Envelope{
		"chats": chats,
		"meta":  meta,
	})
}
func (app *application) DeleteChatHandler(w http.ResponseWriter, r *http.Request) {
	// Get the chat ID from the URL parameter
	chatIDStr := r.PathValue("chat_id")
	chatID, err := uuid.Parse(chatIDStr)
	if err != nil {
		app.badRequestResponse(w, r, errors.New("invalid chat ID"))
		return
	}

	// Retrieve the chat to get sender and receiver IDs
	chat, err := app.Model.ChatDB.GetChatByID(chatID) // Assuming you have a method to get chat by ID
	if err != nil {
		if errors.Is(err, data.ErrRecordNotFound) {
			app.handleRetrievalError(w, r, errors.New("chat not found"))
		} else {
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	// Call the DeleteChat method to delete the chat
	err = app.Model.ChatDB.DeleteChat(chatID)
	if err != nil {
		if errors.Is(err, data.ErrRecordNotFound) {
			app.handleRetrievalError(w, r, errors.New("chat not found"))
		} else {
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	// Prepare the notification for broadcasting
	notification := map[string]interface{}{
		"type":        "chat_deleted",
		"chat_id":     chatID,
		"message":     "A chat has been deleted",
		"sender_id":   chat.SenderID,
		"receiver_id": chat.ReceiverID,
	}

	// Broadcast the deletion notification to the involved users
	app.wsManager.BroadcastMessage(chat.SenderID, notification)
	app.wsManager.BroadcastMessage(chat.ReceiverID, notification)

	// Return success response
	utils.SendJSONResponse(w, http.StatusOK, utils.Envelope{"message": "Chat deleted successfully"})
}

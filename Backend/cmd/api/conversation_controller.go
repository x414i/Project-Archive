package main

import (
	"errors"
	"net/http"
	"project/utils"
	"time"

	"github.com/google/uuid"
)

func (app *application) GetConversationsHandler(w http.ResponseWriter, r *http.Request) {
	// Retrieve the user ID from the request context
	userIDStr := r.Context().Value(UserIDKey).(string)
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		app.badRequestResponse(w, r, errors.New("invalid user ID"))
		return
	}

	conversations, err := app.Model.ConversationDB.GetConversationsByUserID(userID)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	// Prepare a response structure that includes the required fields
	type ConversationResponse struct {
		ID            uuid.UUID `json:"id"`
		ReceiverName  string    `json:"receiver_name"`
		ReceiverEmail string    `json:"receiver_email"`
		CreatedAt     time.Time `json:"created_at"`
		ReceiverImage *string   `json:"receiver_image"`
	}

	var response []ConversationResponse
	for _, conversation := range conversations {
		var receiverImage *string
		var receiverEmail string

		// Determine the receiver's details based on the current user's ID
		if conversation.User1ID == userID {
			receiverImage = conversation.User2Image // User 2 is the receiver
			receiverEmail = conversation.User2Email // Get User 2's email
		} else {
			receiverImage = conversation.User1Image // User 1 is the receiver
			receiverEmail = conversation.User1Email // Get User 1's email
		}

		// Add the conversation details to the response
		response = append(response, ConversationResponse{
			ID:            conversation.ID,
			ReceiverName:  conversation.ReceiverName,
			ReceiverEmail: receiverEmail,
			CreatedAt:     conversation.CreatedAt,
			ReceiverImage: receiverImage,
		})
	}

	// Send the response back as JSON
	utils.SendJSONResponse(w, http.StatusOK, utils.Envelope{"conversations": response})
}
func (app *application) DeleteConversationHandler(w http.ResponseWriter, r *http.Request) {
	// Retrieve the conversation ID from the URL parameters
	conversationIDStr := r.PathValue("id")
	conversationID, err := uuid.Parse(conversationIDStr)
	if err != nil {
		app.badRequestResponse(w, r, errors.New("invalid conversation ID"))
		return
	}

	// Retrieve the conversation to get sender and receiver IDs
	conversation, err := app.Model.ConversationDB.GetConversationByID(conversationID) // Assuming you have a method to get conversation by ID
	if err != nil {
		app.handleRetrievalError(w, r, err)
		return
	}

	// Call the DeleteConversation method
	err = app.Model.ConversationDB.DeleteConversation(conversationID)
	if err != nil {
		app.handleRetrievalError(w, r, err)
		return
	}

	// Prepare the notification for broadcasting
	notification := map[string]interface{}{
		"type":            "conversation_deleted",
		"conversation_id": conversationID,
		"message":         "A conversation has been deleted",
	}

	// Broadcast the deletion notification to the involved users
	app.wsManager.BroadcastMessage(conversation.User1ID, notification)
	app.wsManager.BroadcastMessage(conversation.User2ID, notification)

	// Send a success response
	utils.SendJSONResponse(w, http.StatusOK, utils.Envelope{"message": "conversation deleted"})
}

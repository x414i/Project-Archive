package main

import (
	"errors"
	"log"
	"net/http"
	"project/utils"
	"sync"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

type WebSocketManager struct {
	clients      map[uuid.UUID]*websocket.Conn
	clientsMutex sync.Mutex
}

func NewWebSocketManager() *WebSocketManager {
	return &WebSocketManager{
		clients: make(map[uuid.UUID]*websocket.Conn),
	}
}

func (wm *WebSocketManager) AddClient(userID uuid.UUID, conn *websocket.Conn) {
	wm.clientsMutex.Lock()
	defer wm.clientsMutex.Unlock()
	wm.clients[userID] = conn
}

func (wm *WebSocketManager) RemoveClient(userID uuid.UUID) {
	wm.clientsMutex.Lock()
	defer wm.clientsMutex.Unlock()
	if conn, ok := wm.clients[userID]; ok {
		conn.Close()
		delete(wm.clients, userID)
	}
}

func (wm *WebSocketManager) BroadcastMessage(userID uuid.UUID, message interface{}) {
	wm.clientsMutex.Lock()
	defer wm.clientsMutex.Unlock()
	if conn, ok := wm.clients[userID]; ok {
		err := conn.WriteJSON(message)
		if err != nil {
			log.Printf("Error sending message to user %s: %v", userID, err)
			conn.Close()
			delete(wm.clients, userID)
		}
	}
}

func (app *application) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(UserIDKey).(string)
	if !ok {
		app.badRequestResponse(w, r, errors.New("missing user ID in context"))
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("Error upgrading to WebSocket: %v", err)
		return
	}

	userIDParsed, err := uuid.Parse(userID)
	if err != nil {
		log.Printf("Invalid user ID format: %v", err)
		app.jwtErrorResponse(w, r, utils.ErrInvalidClaims)
		return
	}

	app.wsManager.AddClient(userIDParsed, conn)
	defer app.wsManager.RemoveClient(userIDParsed)

	for {
		_, _, err := conn.ReadMessage()
		if err != nil {
			log.Printf("WebSocket user %s: %v", userIDParsed, err)
			break
		}
	}
}

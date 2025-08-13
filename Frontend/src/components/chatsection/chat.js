import React, { useState, useEffect, useCallback, useRef } from "react";
import { jwtDecode } from "jwt-decode";
import { FaPaperPlane } from 'react-icons/fa';
import ConversationList from "./ConversationList.js";
import MessageWindow from "./MessageWindow";
import { useWebSocket } from "./usewebsocket.js";
import * as api from "./api";
import "../../style/chat.css";
import { useLocation } from 'react-router-dom';

const Chat = () => {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [receiverEmail, setReceiverEmail] = useState("");
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [loggedInUserId, setLoggedInUserId] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [emailMessage, setEmailMessage] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const location = useLocation();
  const token = localStorage.getItem("token");
  const messageEndRef = useRef(null);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [receiverName, setReceiverName] = useState("");
  const [errors, setErrors] = useState(null);

  useEffect(() => {
    if (location.state?.receiverEmail) {
      setReceiverEmail(location.state.receiverEmail);
      setOverlayVisible(true);
    }
  }, [location.state]);

  const handleDeletedConversation = useCallback((conversationId) => {
    setConversations(prev => prev.filter(conversation => conversation.id !== conversationId));
    setSelectedConversation(null);
    setMessages([]);
    setNewMessage("");
    setReceiverEmail("");
  }, []);

  const handleDeleteConversation = async (conversationId) => {
    try {
      await api.deleteConversation(conversationId, token);
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "conversation_deleted",
            conversation_id: conversationId,
          })
        );
      }
      setConversations((prevConversations) =>
        prevConversations.filter((conv) => conv.id !== conversationId)
      );
      if (selectedConversation && selectedConversation.id === conversationId) {
        setSelectedConversation(null);
        setMessages([]);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleNewMessage = useCallback((newChat) => {
    setMessages(prev => {
      if (!prev.some(message => message.id === newChat.id)) {
        return [...prev, newChat];
      }
      return prev;
    });
  }, []);


  const handleDeletedMessage = useCallback((chatId) => {
    setMessages(prev => {
      const updated = prev.filter(message => {
        const messageId = message.chat_id || message.id;
        return messageId !== chatId;
      });
      if (updated.length === 0) {
        handleDeletedConversation(selectedConversation.id); 
      }
      return updated;
    });
  }, [selectedConversation, handleDeletedConversation]);

  const handleDeleteMessage = async (messageId) => {
    try {
      await api.deleteMessage(messageId, token);
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "chat_deleted",
            chat_id: messageId,
            conversation_id: selectedConversation,
            sender_id: loggedInUserId,
            receiver_id: messages.find(m => m.chat_id === messageId || m.id === messageId)?.receiver_id
          })
        );
      }
      if (messages.length === 1) {
        handleDeleteConversation(selectedConversation);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleBackClick = () => {
    setSelectedConversation(null);
    setMessages([]);
    setReceiverEmail("");
    setOverlayVisible(false);
  };

  const handleWebSocketMessage = useCallback((data) => {
    switch (data.type) {
      case "new_message":
        handleNewMessage(data.chat);
        break;
      case "chat_deleted":
        handleDeletedMessage(data.chat_id);
        break;
      case "conversation_deleted":
        handleDeletedConversation(data.conversation_id);
        break;
      case "new_conversation":
        const fetchUpdatedConversations = async () => {
          try {
            const data = await api.fetchConversations(token);
            setConversations(data);
          } catch (err) {
            setError(err.message);
          }
        };
        fetchUpdatedConversations();
        break;
      default:
        break;
    }
  }, [token, handleNewMessage, handleDeletedMessage, handleDeletedConversation]);

  const wsRef = useWebSocket(token, { onMessage: handleWebSocketMessage });
  
  const loadMoreMessages = async () => {
    if (!hasMore || isLoading) return;
    
    try {
      const nextPage = currentPage + 1;
      const response = await api.fetchMessages(selectedConversation, token, nextPage);
      
      if (response.messages.length === 0) {
        setHasMore(false);
        return;
      }
      
      // Merge existing messages with new messages and sort
      const mergedMessages = [...messages, ...response.messages]
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      
      setMessages(mergedMessages);
      setCurrentPage(nextPage);
      setHasMore(nextPage < response.meta.last_page);
    } catch (err) {
      setError(err.message);
    }
  };
  const fetchMessages = useCallback(async (conversationId) => {
    try {
      setSelectedConversation(conversationId);
      setMessages([]);
      setIsLoading(true);
      setCurrentPage(1);
      setHasMore(true);
      
      const response = await api.fetchMessages(conversationId, token, 1);
      
      // Sort messages to ensure latest messages are at the bottom
      const sortedMessages = response.messages.sort((a, b) => 
        new Date(a.created_at) - new Date(b.created_at)
      );
      
      // Set initial messages with sorted order
      setMessages(sortedMessages);
      setHasMore(response.meta.current_page < response.meta.last_page);
      
      const conversation = conversations.find((conv) => conv.id === conversationId);
      if (conversation) {
        setReceiverEmail(conversation.receiver_email);
        setReceiverName(conversation.receiver_name);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [token, conversations]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (isSending || (!newMessage.trim() && !selectedFile)) return;
    
    setIsSending(true);
    try {
      const formData = new FormData();
      formData.append("receiver_email", receiverEmail);
      formData.append("sender_name", jwtDecode(token).name);
      
      if (newMessage.trim()) formData.append("message", newMessage);
      if (selectedFile) formData.append("file", selectedFile);
  
      const response = await fetch("http://localhost:8080/chats", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
  
      if (!response.ok) throw new Error("Failed to send message");
  
      const data = await response.json();
      
      // Immediately update UI
      handleNewMessage(data.chat);
      
      // Clear input fields
      setNewMessage("");
      setSelectedFile(null);
      
      // Auto-select the conversation if not already selected
      if (!selectedConversation) {
        setSelectedConversation(data.chat.conversation_id);
        fetchMessages(data.chat.conversation_id);
      }
  
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSending(false);
    }
  };
  
const handleSendEmail = async (e) => {
  e.preventDefault();
  if (isSending) return;
  setIsSending(true);
  setErrors(null);
  if (!emailMessage.trim() && !selectedFile) {
    setErrors("يجب إدخال وصف أو اختيار ملف"); // "You must enter a description or select a file"
    setIsSending(false); // Reset sending state
    return; // Exit the function early
  }
  try {
    const formData = new FormData();
    formData.append("receiver_email", receiverEmail);
    formData.append("sender_name", jwtDecode(token).name);
    formData.append("message", emailMessage);
    if (selectedFile) {
      formData.append("file", selectedFile);
    }

    const response = await fetch("http://localhost:8080/chats", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to send email");
    }

    const data = await response.json();
    
    // Update conversations list immediately
    setConversations(prevConversations => {
      const existingConversation = prevConversations.find(
        conv => conv.id === data.chat.conversation_id
      );
      
      if (existingConversation) {
        return prevConversations.map(conv => 
          conv.id === data.chat.conversation_id 
            ? { ...conv, last_message: data.chat }
            : conv
        );
      } else {
        // Create new conversation object
        const newConversation = {
          id: data.chat.conversation_id,
          receiver_email: receiverEmail,
          receiver_name: data.chat.receiver_name || receiverEmail,
          last_message: data.chat,
          created_at: data.chat.created_at,
          updated_at: data.chat.created_at
        };
        return [...prevConversations, newConversation];
      }
    });

    // Set selected conversation and load messages
    setSelectedConversation(data.chat.conversation_id);
    setMessages([data.chat]); // Initialize with the new message

    // Clear form
    setEmailMessage("");
    setSelectedFile(null);
    setOverlayVisible(false);

    // Fetch complete conversation messages
    fetchMessages(data.chat.conversation_id);

  } catch (err) {
    setError(err.message);
  } finally {
    setIsSending(false);
  }
};


  const handleFileSelect = (file) => {
    setSelectedFile(file);
  };

  const handleSendEmailButtonClick = () => {
    setOverlayVisible(true);
  };

  useEffect(() => {
    if (token) {
      try {
        const decodedToken = jwtDecode(token);
        setLoggedInUserId(decodedToken.id);
      } catch (err) {
        setError("Invalid token");
      }
    }
  }, [token]);

  useEffect(() => {
    const fetchInitialConversations = async () => {
      try {
        setIsLoading(true);
        const data = await api.fetchConversations(token);
        setConversations(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    if (token) {
      fetchInitialConversations();
    }
  }, [token]);
  const handleRemoveFile = () => {
    setSelectedFile(null);
  };

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className={`chat-container ${selectedConversation ? 'conversation-selected' : ''}`} style={{ direction: "rtl" }}>
      <ConversationList
        conversations={conversations}
        selectedConversation={selectedConversation}
        onSelectConversation={fetchMessages}
        isLoading={isLoading}
        error={error}
        onDeleteConversation={handleDeleteConversation}
      />

  {selectedConversation ? (
    <MessageWindow
      selectedConversation={selectedConversation}
      messages={messages}
      newMessage={newMessage}
      setNewMessage={setNewMessage}
      handleSendMessage={handleSendMessage}
      isLoading={isLoading}
      loggedInUserId={loggedInUserId}
      selectedFile={selectedFile}
      onFileSelect={handleFileSelect}
      error={error}
      handleDeleteMessage={handleDeleteMessage}
      messageEndRef={messageEndRef}
      onRemoveFile={handleRemoveFile}
      onBackClick={handleBackClick}
      isSending={isSending}
      receiverName={receiverName}
      onLoadMore={loadMoreMessages}
      hasMore={hasMore}
    />
      ) : (
        <div className="select-conversation-message">
          <FaPaperPlane className="send-icon" /> اختر محادثة
        </div>
      )}

{windowWidth > 780 && (
        <button 
          className="overlay-button" 
          onClick={handleSendEmailButtonClick}
        >
          إرسال بريد إلكتروني
        </button>
      )}
{windowWidth <= 780 && (
        <button 
          className="mobile-email-button"
          onClick={handleSendEmailButtonClick}
        >
          إرسال بريد إلكتروني
        </button>
      )}

     
{overlayVisible && (
        <div className="overlay">
          <div className="overlays-content">
            <h2>إرسال بريد إلكتروني</h2>
            <form onSubmit={handleSendEmail}>
              <input
                type="email"
                placeholder="البريد الإلكتروني للمستلم"
                value={receiverEmail}
                onChange={(e) => setReceiverEmail(e.target.value)}
                className="email-input"
                required
              />
              <textarea
                placeholder="اكتب رسالتك هنا"
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                className="message-input"
              />
              <div className="form-group">
                <label>
                  ملف (اختياري)
                  <div className="file-upload">
                    <span>{selectedFile ? selectedFile.name : "اختر ملف"}</span>
                    <input
                      type="file"
                      onChange={(e) => handleFileSelect(e.target.files[0])}
                      className="file-input"
                    />
                  </div>
                </label>
              </div>

              <button type="submit" disabled={isSending} className="buttonforsending">
                {isSending ? 'جاري الإرسال...' : 'إرسال'}
              </button>
              <button type="button" onClick={() => setOverlayVisible(false)} className="buttonforcancelingsending">
                إغلاق
              </button>
            </form>
            {errors && <div className="error-message">{errors}</div>}
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;

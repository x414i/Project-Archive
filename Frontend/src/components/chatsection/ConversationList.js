import React, { useEffect, useState } from "react";

const ConversationList = ({
  conversations = [], // Provide default empty array
  selectedConversation,
  onSelectConversation,
  isLoading,
  error,
  onDeleteConversation
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState(null);

  const confirmDelete = (conversationId) => {
    setConversationToDelete(conversationId);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirmed = () => {
    if (conversationToDelete) {
      onDeleteConversation(conversationToDelete); // Call the prop function to delete the conversation
      setShowDeleteConfirm(false);
      setConversationToDelete(null);
    }
  };
  const handleDeleteCancelled = () => {
    setShowDeleteConfirm(false);
    setConversationToDelete(null);
  };
  useEffect(()=>{
    console.log(conversations);
  },[conversations])
  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
<div className="conversations-container" style={{ direction: "rtl" }}>
  <div className="conversations-header">
    <h2>المحادثات</h2>
  </div>
  {isLoading && <div className="loading">جار التحميل...</div>}
  <div className="conversations-list">
    {conversations.filter(Boolean).map((conversation) => (
        <div key={conversation.id} className={`conversation-item ${selectedConversation === conversation.id ? "active" : ""}`} onClick={() => onSelectConversation(conversation.id)}>
            <div className="conversation-info">
                <div className="conversation-avatar">
                    {conversation.receiver_image ? (
                        <img src={conversation.receiver_image} alt={conversation.receiver_name} className="avatar-image" />
                    ) : (
                        conversation ? conversation.receiver_name[0].toUpperCase() : "مجهول"
                    )}
                </div>
                <div className="conversation-details">
    <span className="conversation-name">{conversation.receiver_name }</span>
    {conversation.receiver_email && (
      <span className="conversation-email">{conversation.receiver_email}</span>
    )}
  </div>
            </div>
            <button className="delete-conversation-button" onClick={(e) => { e.stopPropagation(); confirmDelete(conversation.id); }}>
                حذف
            </button>
        </div>
    ))}
</div>
  {showDeleteConfirm && (
    <div className="modal-overlay">
      <div className="delete-confirmation">
        <h3>هل أنت متأكد أنك تريد حذف هذه المحادثة؟</h3>
        <div className="confirmation-buttons">
          <button className="confirm-yes" onClick={handleDeleteConfirmed}>
            نعم
          </button>
          <button className="confirm-no" onClick={handleDeleteCancelled}>
            لا
          </button>
        </div>
      </div>
    </div>
  )}
      {showDeleteConfirm && (
        <div className="modal-overlay">
          <div className="delete-confirmation">
            <h3>هل أنت متأكد أنك تريد حذف هذه المحادثة؟</h3>
            <div className="confirmation-buttons">
              <button className="confirm-yes" onClick={handleDeleteConfirmed}>
                نعم
              </button>
              <button className="confirm-no" onClick={handleDeleteCancelled}>
                لا
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConversationList;
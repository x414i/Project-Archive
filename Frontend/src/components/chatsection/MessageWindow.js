import React, { useRef, useEffect, useState } from "react";
import { format } from "date-fns";
import { IoAttach, IoSend } from "react-icons/io5";
import { Sparkles } from 'lucide-react';
import Modal from '../model';
import VoiceRecorder from './voicerecorder';
import AudioPlayer from './audioplayer';
import '../../style/message-window.css';

const MessageWindow = ({
  selectedConversation,
  messages,
  newMessage,
  setNewMessage,
  handleSendMessage,
  isLoading,
  loggedInUserId,
  selectedFile,
  onFileSelect = () => {},
  error,
  handleDeleteMessage,
  onRemoveFile,
  isSending,
  onBackClick,
  receiverName,
  onLoadMore,
  hasMore
}) => {
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentMedia, setCurrentMedia] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [prevScrollHeight, setPrevScrollHeight] = useState(0);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [prevMessagesLength, setPrevMessagesLength] = useState(0);
  const [fileError, setFileError] = useState("");

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      const shouldScrollToBottom = isFirstLoad || messages.length > prevMessagesLength;
      if (shouldScrollToBottom) {
        container.scrollTop = container.scrollHeight;
      }
      setIsFirstLoad(false);
      setPrevMessagesLength(messages.length);
    }
  }, [messages, isFirstLoad, prevMessagesLength]);

  const handleScroll = async (e) => {
    const container = e.target;
    if (container.scrollTop === 0 && !isLoadingMore && hasMore) {
      setIsLoadingMore(true);
      setPrevScrollHeight(container.scrollHeight);
      setPrevMessagesLength(messages.length);
      await onLoadMore();
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container && prevScrollHeight > 0) {
      const newScrollPosition = container.scrollHeight - prevScrollHeight;
      container.scrollTop = newScrollPosition;
    }
  }, [messages.length, prevScrollHeight]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [newMessage]);

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 100 * 1024 * 1024) {
        setFileError("حجم الملف يجب أن يكون أقل من 100MB.");
      } else {
        setFileError("");
        onFileSelect(file);
      }
    }
  };

  const openModal = (mediaSrc) => {
    if (!mediaSrc.toLowerCase().endsWith('.mp4')) {
      setCurrentMedia(mediaSrc);
      setIsModalOpen(true);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentMedia(null);
  };

  const confirmDelete = (message) => {
    setMessageToDelete(message);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirmed = () => {
    if (messageToDelete) {
      const messageId = messageToDelete.chat_id || messageToDelete.id;
      if (messageId) {
        handleDeleteMessage(messageId);
        setShowDeleteConfirm(false);
        setMessageToDelete(null);
      }
    }
  };

  const handleDeleteCancelled = () => {
    setShowDeleteConfirm(false);
    setMessageToDelete(null);
  };

  const renderMessage = (message) => {
    const isCurrentUser = message.sender_id === loggedInUserId;
    const time = format(new Date(message.created_at), 'yyyy/MM/dd HH:mm');
    const messageId = message.chat_id || message.id;
  
    const imageExtensions = [
      '.jpg', '.jpeg', '.png', '.gif', '.webp', 
      '.bmp', '.tiff', '.svg', '.heic'
    ];
    
    const videoExtensions = [
      '.mp4', '.webm', '.avi', '.mov', '.mkv', 
      '.flv', '.wmv', '.m4v', '.mpg', '.mpeg'
    ];
  
    const checkFileExtension = (filename, extensionList) => {
      return extensionList.some(ext => 
        filename.toLowerCase().endsWith(ext)
      );
    };
  
    const fileUrl = `http://localhost:8080/${message.file}`;
    const isAudioMessage = message.file && message.file.toLowerCase().endsWith('.wav');
  
    return (
      <div
        key={`${messageId}-${message.created_at}`}
        className={`message ${isCurrentUser ? "sent" : "received"}`}
      >
        <div className={`message-bubble ${isCurrentUser ? "sent-bubble" : "received-bubble"}`}>
          <div className={`message-sender ${isCurrentUser ? "sent-sender" : "received-sender"}`}>
            {isCurrentUser ? "" : message.sender_name}
          </div>
          <div className="message-content">
            <div className="message-text">
              {message.message}
            </div>
            {message.file && (
              <div className="message-file">
                {isAudioMessage ? (
                  <AudioPlayer src={fileUrl} />
                ) : checkFileExtension(message.file, imageExtensions) ? (
                  <img
                    src={fileUrl}
                    alt="Message attachment"
                    className="message-image"
                    onClick={() => openModal(fileUrl)}
                  />
                ) : checkFileExtension(message.file, videoExtensions) ? (
                  <div className="video-container">
                    <video
                      src={fileUrl}
                      controls
                      className="message-video"
                      playsInline
                      preload="metadata"
                    >
                      <source src={fileUrl} type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                  </div>
                ) : message.file.toLowerCase().endsWith('.pdf') ? (
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="view-pdf-link"
                  >
                    عرض PDF
                  </a>
                ) : (
                  <a 
                    href={fileUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="view-attachment-link"
                  >
                    عرض المرفق
                  </a>
                )}
              </div>
            )}
          </div>
          <div className="message-time">
            <p className="createdattime">{time}</p>
          </div>
        </div>
        {isCurrentUser && (
          <div className="message-delete-container">
            <button
              onClick={() => confirmDelete(message)}
              className="deleting-button"
            >
              حذف
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={closeModal}
          mediaSrc={currentMedia}
        />
      )}
      <div className="mobile-header">
        <button className="back-button" onClick={onBackClick}>
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M19 12H5M12 19L5 12L12 5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <h2>{receiverName || "المحادثات"}</h2>
      </div>
      <div className="message-window-container" style={{ direction: "rtl" }}>
        {isLoading ? (
          <div className="loading">جار تحميل الرسائل...</div>
        ) : (
          <div className="messages-container" ref={messagesContainerRef} onScroll={handleScroll}>
            {isLoadingMore && (
              <div className="loading-more">جار تحميل المزيد من الرسائل...</div>
            )}
            <div className="messages-list">
              {messages.map(renderMessage)}
              <div ref={messagesEndRef} style={{ float: "left", clear: "both" }} />
            </div>
          </div>
        )}
        {error && <div className="error">{error}</div>}
        {fileError && <div className="error">{fileError}</div>}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage(e);
          }}
          className="message-input-container"
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            style={{ display: 'none' }}
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
          />
          <button type="button" onClick={handleFileClick} className="attachs-buttons" disabled={isSending}>
            <IoAttach />
          </button>
          
          <VoiceRecorder
            onRecordingComplete={(audioFile) => {
              onFileSelect(audioFile);
            }}
          />
          
          <div className="input-wrapper">
            {selectedFile && (
              <div className="selected-file-container">
                <div className="selected-file-preview">
                  {selectedFile.type.startsWith("image/") ? (
                    <img
                      src={URL.createObjectURL(selectedFile)}
                      alt="Preview"
                      className="preview-image"
                    />
                  ) : selectedFile.type.startsWith("video/") ? (
                    <div className="video-container">
                      <video controls className="preview-video">
                        <source src={URL.createObjectURL(selectedFile)} type={selectedFile.type} />
                        متصفحك لا يدعم الملفات
                      </video>
                    </div>
                  ) : selectedFile.type.startsWith("audio/") ? (
                    <AudioPlayer src={URL.createObjectURL(selectedFile)} />
                  ) : (
                    <p>{selectedFile.name}</p>
                  )}
                </div>
                <button 
                  type="button" 
                  className="remove-file-btn"
                  onClick={onRemoveFile}
                  disabled={isSending}
                >
                  ×
                </button>
              </div>
            )}
            
            <input
              type="text"
              placeholder={isSending ? "جار الإرسال..." : "اكتب رسالتك..."}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="message-input"
              disabled={isSending}
            />
          </div>
          
          <button type="submit" className="send-buttons" disabled={isSending}>
            {isSending ? (
              <div className="loadings-container">
                <Sparkles className="loadings-icon" />
                <span>جاري ارسال الرساله...</span>
              </div>
            ) : (
              <IoSend />
            )}
          </button>
        </form>

        {showDeleteConfirm && (
          <div className="modal-overlay">
            <div className="delete-confirmation">
              <h3>هل أنت متأكد أنك تريد حذف هذه الرسالة؟</h3>
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
    </>
  );
};

export default MessageWindow;
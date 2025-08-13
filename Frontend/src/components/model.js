import React, { useEffect, useRef, useState } from 'react';
import '../style/model.css';

const Modal = ({ isOpen, onClose, mediaSrc }) => {
  const videoRef = useRef(null);
  const modalRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };

    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onClose();
      }
    };

   
    window.addEventListener('keydown', handleEscape);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
      
   
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff'];
  const videoExtensions = ['.mp4', '.webm', '.avi', '.mov', '.mkv', '.m4v'];

  const isImage = imageExtensions.some(ext => mediaSrc.toLowerCase().endsWith(ext));
  const isVideo = videoExtensions.some(ext => mediaSrc.toLowerCase().endsWith(ext));

  const handleVideoClick = (e) => {
    e.stopPropagation();
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
    }
  };

  return (
    <div className="modal-backdrop">
      <button 
        className="modal-close" 
        onClick={onClose} 
        aria-label="Close modal"
      >
        ×
      </button>
      <div className="modal-container" ref={modalRef}>
        <div className="modal-content">
          {isLoading && (
            <div className="modal-loading">
              <div className="spinner"></div>
            </div>
          )}
          {isVideo ? (
            <video 
              ref={videoRef}
              src={mediaSrc} 
              controls 
              className="modal-video"
              playsInline
              controlsList="nodownload"
              preload="metadata"
              onLoadedData={() => setIsLoading(false)}
              onClick={handleVideoClick}
              onPause={() => videoRef.current?.pause()}
            />
          ) : isImage ? (
            <img 
              src={mediaSrc} 
              alt="Modal Content" 
              className="modal-image"
              loading="lazy"
              onLoad={() => setIsLoading(false)}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <a 
              href={mediaSrc} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="modal-file-link"
              onClick={(e) => e.stopPropagation()}
            >
              View File
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default Modal;
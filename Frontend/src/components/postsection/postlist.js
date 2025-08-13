import React, { useEffect, useState, useCallback } from "react";
import "../../style/postlist.css";
import PostForm from './postform';
import Modal from '../model'; // Import the Modal component
import FileUpload from '../fileupload'; // Import the FileUpload component
import { jwtDecode } from "jwt-decode"; // Import jwt-decode
import '@fortawesome/fontawesome-free/css/all.min.css';

function PostsList() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentMedia, setCurrentMedia] = useState(null);
  const [playingVideo, setPlayingVideo] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [currentPost, setCurrentPost] = useState(null);
  const [newFile, setNewFile] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false); // State to track if user is admin
  const [errorMessage, setErrorMessage] = useState(""); // State for error messages
  const [hasMore, setHasMore] = useState(true);
  const [isFetching, setIsFetching] = useState(false); // To track if more posts are being fetched
const [page, setPage] = useState(1);

  const checkUserRole = () => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        const userRoles = Array.isArray(decoded.user_role)
          ? decoded.user_role
          : [decoded.user_role];
        setIsAdmin(userRoles.includes("admin"));
      } catch (error) {
        console.error("Error decoding token:", error);
        setIsAdmin(false);
      }
    } else {
      setIsAdmin(false);
    }
  };
  const fetchPosts = async (page = 1) => {
    setIsFetching(true);
    try {
        const response = await fetch(
            `http://localhost:8080/post?page=${page}&per_page=12&sort=-created_at`
        );
        const data = await response.json();

        if (data.posts && data.posts.length > 0) {
            setPosts((prevPosts) => [...prevPosts, ...data.posts]);
            setHasMore(page < data.meta.last_page); // Check if there are more pages
        } else {
            setHasMore(false);
        }
    } catch (error) {
        console.error("Error fetching posts:", error);
    } finally {
        setIsFetching(false);
        setLoading(false); // Ensure loading spinner stops
    }
};

  useEffect(() => {
    checkUserRole();
    fetchPosts(page); // Use page here
  }, [page]);
  const handleScroll = useCallback(() => {
    if (
        window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.offsetHeight - 100 &&
        hasMore &&
        !isFetching
    ) {
        setPage((prevPage) => prevPage + 1); // Increment page here
    }
}, [hasMore, isFetching]);
  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const handlePostCreated = async () => {
    setPosts([]);
    setPage(1);
    await fetchPosts(1);
  };


  const openModal = (mediaSrc) => {
    setCurrentMedia(mediaSrc);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentMedia(null);
  };

  const handleVideoClick = (videoSrc) => {
    setPlayingVideo(playingVideo === videoSrc ? null : videoSrc);
  };

  const startEditing = (post) => {
    setCurrentPost(post);
    setIsEditing(true);
    setNewFile(null);
  };

  const closeEditing = () => {
    setIsEditing(false);
    setCurrentPost(null);
    setNewFile(null);
  };

  const handleUpdatePost = async () => {
    if (!currentPost) return;
    setErrorMessage(""); // Reset error message before submission

    const formData = new FormData();
    formData.append("description", currentPost.description);
    if (newFile) {
      formData.append("file", newFile);
    }

    try {
      const response = await fetch(`http://localhost:8080/post/${currentPost.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json(); 
        throw new Error(errorData.error.description || "An error occurred while updating the post.");  
 

          }
      if (response.ok) {
        window.location.reload();
      }
    } catch (error) {
      setErrorMessage(error.message);
      console.error("خطأ في تحديث المنشور:", error);
    }
  };

  const handleDeletePost = async (postId) => {
    setErrorMessage(""); // Reset error message before submission

    if (window.confirm("هل أنت متأكد أنك تريد حذف هذا المنشور؟")) {
        try {
            const response = await fetch(`http://localhost:8080/post/${postId}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
            });

            if (response.ok) {
                // Update the posts list by filtering out the deleted post
                setPosts((prevPosts) => prevPosts.filter(post => post.id !== postId));
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error.description || "An error occurred while deleting the post.");
            }
        } catch (error) {
            setErrorMessage(error.message);
            console.error("خطأ في حذف المنشور:", error);
        }
    }
};
  const splitDescription = (description) => {
    const chunkSize = 74; // Number of characters per line
    const regex = new RegExp(`.{1,${chunkSize}}`, 'g'); // Create a regex to match chunks
    return description.match(regex).map((line, index) => (
      <span key={index}>
        {line}
        <br />
      </span>
    ));
  };
  const isArabic = (text) => {
    // Check if the first character is an Arabic character
    return /[\u0600-\u06FF]/.test(text.charAt(0));
}
 
return (
  <div className="main-container">
      <PostForm onPostCreated={handlePostCreated} />

      {loading ? (
          <div className="loading-state">
              <div className="spinner"></div>
              <p>جاري تحميل منشورات القسم...</p>
          </div>
      ) : (
          <div className="posts-container">
              {posts.length > 0 ? (
                  posts.map((post) => (
                      <div className="post-card" key={post.id}>
                          <h5
                              className={
                                  post.description.length > 50 && !post.description.includes(" ")
                                      ? "long-description"
                                      : ""
                              }
                              style={{
                                  textAlign: isArabic(post.description) ? 'right' : 'left', // Set text alignment based on language
                                  direction: isArabic(post.description) ? 'rtl' : 'ltr' // Set text direction based on language
                              }}
                          >
                              {post.description.length > 50 && !post.description.includes(" ")
                                  ? splitDescription(post.description)
                                  : post.description}
                          </h5>

                          {/* Render image files */}
                          {post.file &&
                              [".jpg", ".jpeg", ".png", ".gif", ".webp"].some((ext) =>
                                  post.file.endsWith(ext)
                              ) && (
                                  <div className="media-container">
                                      <img
                                          src={post.file.replace("\\", "/")}
                                          alt={post.description}
                                          onClick={() => openModal(post.file)}
                                      />
                                  </div>
                              )}

                          {/* Render video files */}
                          {post.file &&
                              [".mp4", ".webm", ".avi", ".mov"].some((ext) =>
                                  post.file.endsWith(ext)
                              ) && (
                                  <div className="media-container">
                                      <video
                                          src={post.file.replace("\\", "/")}
                                          controls
                                          onClick={() => handleVideoClick(post.file)}
                                      />
                                  </div>
                              )}

                          {/* Show "View File" link for other file types */}
                          {post.file &&
                              ![
                                  ".jpg",
                                  ".jpeg",
                                  ".png",
                                  ".gif",
                                  ".webp",
                                  ".mp4",
                                  ".webm",
                                  ".avi",
                                  ".mov",
                              ].some((ext) => post.file.endsWith(ext)) && (
                                  <a
                                      href={post.file}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="view-file-link"
                                  >
                                      عرض الملف
                                  </a>
                              )}

                          <p className="post-date">
                              {new Date(post.created_at).toLocaleString("en-us", {
                                  year: "numeric",
                                  month: "numeric",
                                  day: "numeric",
                                  hour: "numeric",
                                  minute: "numeric",
                                  hour12: false,
                              })}
                              {post.updated_at &&
                              new Date(post.created_at) < new Date(post.updated_at)
                                  ? " (تم التعديل)"
                                  : ""}
                          </p>

                          <div className="post-actions">
                              {isAdmin && (
                                  <>
                                      <button
                                          className="edit-button"
                                          onClick={() => startEditing(post)}
                                      >
                                          تعديل
                                      </button>
                                      <button
                                          className="delete-buttons"
                                          onClick={() => handleDeletePost(post.id)}
                                      >
                                          حذف
                                      </button>
                                  </>
                              )}
                          </div>
                      </div>
                  ))
              ) : (
                  <div className="no-posts-message">
                      <div className="no-posts-icon">
                          <i className="fas fa-folder-open"></i>
                      </div>
                      <p>لا يوجد منشورات!</p>
                  </div>
              )}
          </div>
      )}
  
      {/* Social icons */}
      <div className="social-icons">
        <a
          href="https://www.facebook.com/groups/IT.almarj"
          className="icon facebook"
          target="_blank"
          rel="noopener noreferrer"
        >
          <i className="fab fa-facebook-f"></i>
        </a>
        <a
          href="mailto:yourmail@gmail.com"
          className="icon gmail"
          target="_blank"
          rel="noopener noreferrer"
        >
          <i className="fas fa-envelope"></i>
        </a>
      </div>
  
      {/* Modal for viewing media */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        mediaSrc={currentMedia}
      />
  
  {isEditing && currentPost && (
  <div className="edit-overlay">
    <div className="edit-content">
      <h5>تعديل المنشور</h5>
      <textarea
        value={currentPost.description}
        onChange={(e) =>
          setCurrentPost({ ...currentPost, description: e.target.value })
        }
        placeholder="وصف المنشور"
      />
      <FileUpload file={newFile} onFileChange={setNewFile} accept="image/*" />

      {/* Show the current file if it exists */}
      {currentPost.file && (
        <div className="current-file">
<p className="current-file-label">الملف الحالي</p>
          {currentPost.file.endsWith('.jpg') || currentPost.file.endsWith('.jpeg') || currentPost.file.endsWith('.png') || currentPost.file.endsWith('.gif') ? (
            <img
              src={currentPost.file.replace("\\", "/")}
              alt="Current file"
              style={{ maxWidth: "500px", maxHeight: "500px", width: "100%", height: "auto" }} // Adjusted size
            />
          ) : currentPost.file.endsWith('.mp4') || currentPost.file.endsWith('.webm') || currentPost.file.endsWith('.avi') || currentPost.file.endsWith('.mov') ? (
            <video
              src={currentPost.file.replace("\\", "/")}
              controls
              style={{ maxWidth: "500px", maxHeight: "500px", width: "100%", height: "auto" }} // Adjusted size
            />
          ) : (
            <p>نوع الملف غير مدعوم للعرض.</p>
          )}
        </div>
      )}

      {errorMessage && <div className="error-message">{errorMessage}</div>}

      <div className="edit-buttons">
        <button className="save-changes" onClick={handleUpdatePost}>
          حفظ التغييرات
        </button>
        <button className="cancel-button" onClick={closeEditing}>
          إلغاء
        </button>
      </div>
    </div>
  </div>
)}
  
      {/* Message for no more posts */}
      {!hasMore && !loading && (
        <div className="no-more-posts-container">
    <i className="fas fa-folder-open no-more-posts-icon"></i>
    <p className="no-more-posts">لا يوجد منشورات اخرى</p>
</div>      )}
    </div>
  );
  
}

export default PostsList;
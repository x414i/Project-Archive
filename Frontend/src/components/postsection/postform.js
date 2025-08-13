import React, { useState, useEffect } from "react";
import FileUpload from '.././fileupload'; // Import the FileUpload component
import { jwtDecode } from "jwt-decode"; // Corrected import for jwt-decode

function PostForm({ onPostCreated }) {
  const [description, setDescription] = useState("");
  const [file, setFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [errorMessage, setErrorMessage] = useState(""); // State for error messages

  const checkUserRole = () => {
    const token = localStorage.getItem("token");

    if (token) {
      try {
        const decode = jwtDecode(token);

        const userRoles = decode?.user_role 
        ? (Array.isArray(decode.user_role) 
            ? decode.user_role 
            : [decode.user_role]) // Ensure it's always an array
        : [];

              

        setIsAdmin(userRoles.some(role => role === "admin")); // Check if "admin" role exists
      } catch (error) {
        console.error("Error decoding token:", error);
        setIsAdmin(false); // Default to false if token is invalid
      }
    } else {
      console.warn("No token found in local storage.");
      setIsAdmin(false); // Default to false if no token exists
    }
  };

  useEffect(() => {
    checkUserRole(); // Check user role on component mount
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(""); // Reset error message before submission
     // Validate that at least one field is filled
     if (!description && !file) {
      setErrorMessage("يجب إدخال وصف أو صورة للمنشور.");
      setIsSubmitting(false);
      return;
    }
    // Validate that description is between 20 and 4000 characters
    if ((description.length < 20 || description.length > 4000)&&!file) {
      setErrorMessage("يجب أن يكون الوصف بين 20 و 4000 حرف.");
      setIsSubmitting(false);
      return;
    }
  
 
  
    // Create FormData to send file and description
    const formData = new FormData();
    formData.append("description", description);
    if (file) {
      formData.append("file", file);
    }
  
    try {
      const response = await fetch("http://localhost:8080/post", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: formData,
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        // Check if errorData has a message and set it
        throw new Error(errorData.message || "فشل في إنشاء المنشور");
      }
  
      const newPost = await response.json();
      onPostCreated(newPost); // Trigger the callback to refresh posts
  
      setDescription("");
      setFile(null);
    } catch (error) {
      setErrorMessage(error.message); // Set the error message to display
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };
  if (!isAdmin) {
    return null; // Hide the form if the user is not an admin
  }

  return (
    <div className="post-form">
      <h2>انشاء منشور</h2>
      {errorMessage && <div className="error-message">{errorMessage}</div>} {/* Display error message */}
      <form onSubmit={handleSubmit}>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="ما الذي تريد نشره؟"
          rows="5"
        ></textarea>

        <FileUpload file={file} onFileChange={setFile} accept="image/*" />

        <button type="submit" disabled={isSubmitting} className="submitpostbutton">
          {isSubmitting ? "يتم النشر..." : "نشر"}
        </button>
      </form>
    </div>
  );
}

export default PostForm;
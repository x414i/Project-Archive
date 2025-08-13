import React, { useRef, useState } from "react";
import '../style/fileupload.css'; // Import the CSS file for styling

const FileUpload = ({ file, onFileChange, label = "اختر ملف", acceptImages = false }) => {
  const fileInputRef = useRef(null);
  const [preview, setPreview] = useState(null); // State for file preview
  const [fileType, setFileType] = useState(null); // State to store the file type

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];

    // If acceptImages is true, check if the selected file is an image
    if (acceptImages && selectedFile && !selectedFile.type.startsWith('image/')) {
      alert('يرجى اختيار ملف صورة فقط');
      onFileChange(null); // Clear the file if it's not an image
      setPreview(null); // Clear the preview
      return;
    }

    onFileChange(selectedFile);
    
    // Set the preview URL for the file
    if (selectedFile) {
      const fileURL = URL.createObjectURL(selectedFile);
      setPreview(fileURL);
      setFileType(selectedFile.type.split('/')[0]); // Set the file type (e.g., 'image', 'video')
    } else {
      setPreview(null); // Clear the preview if no file is selected
      setFileType(null); // Clear the file type
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current.click(); // Programmatically trigger the file input
  };

  return (
    <div className="file-upload" onClick={triggerFileInput}>
      <span className="file-name">{file ? file.name : label}</span> {/* Use the label prop here */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: "none" }} 
        accept={acceptImages ? "image/*" : "*/*"} // Accept images if acceptImages is true
      />
      {preview && (
        fileType === 'image' ? (
          <img src={preview} alt="Preview" />
        ) 
         : null
      )}
    </div>
  );
};

export default FileUpload;
import React, { useState, useEffect } from "react";
import "../../style/profile.css";

const Profile = () => {
  const [userData, setUserData] = useState({
    id: "",
    name: "",
    email: "",
    password: "",
    image: null,
    imageUrl: "",
  });
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = () => {
    const token = localStorage.getItem("token");

    fetch("http://localhost:8080/me", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("فشل في جلب بيانات المستخدم");
        }
        return response.json();
      })
      .then((data) => {
        const fetchedRoles = data.users.roles || [];
        setRoles(fetchedRoles);

setIsAdmin(fetchedRoles.includes("admin"));
        setUserData({
          id: data.users.id,
          name: data.users.name,
          email: data.users.email,
          password: "",
          image: null,
          imageUrl: data.users.image || "",
        });
        setLoading(false);
      })
      .catch((error) => {
        console.error("خطأ أثناء جلب بيانات المستخدم:", error);
        setMessage({ text: "فشل في تحميل بيانات المستخدم", type: "error" });
        setLoading(false);
      });
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setFieldErrors((prevErrors) => ({
      ...prevErrors,
      [name]: "", // Clear error for the field being changed
    }));
    if (name === "image") {
      const file = files[0];
      setUserData((prevData) => ({
        ...prevData,
        [name]: file,
        imageUrl: URL.createObjectURL(file),
      }));
    } else {
      setUserData((prevData) => ({
        ...prevData,
        [name]: value,
      }));
    }
  };
  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData();
  
    // Always append these
    formData.append("name", userData.name);
    formData.append("email", userData.email);
    
    if (userData.password) {
      formData.append("password", userData.password);
    }
    
    if (userData.image) {
      formData.append("image", userData.image);
    }
  
    const token = localStorage.getItem("token");
  
    fetch(`http://localhost:8080/users/${userData.id}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    })
      .then((response) => {
        if (!response.ok) {
          return response.json().then(errorData => {
            throw new Error(JSON.stringify(errorData));
          });
        }
        return response.json();
      })
      .then((data) => {
        setMessage({ text: "تم تحديث الملف الشخصي بنجاح!", type: "success" });
        setFieldErrors({});
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      })
      .catch((error) => {
        try {
          const errorData = JSON.parse(error.message);
          
          // Handle different error formats
          if (typeof errorData.error === 'string') {
            // If error is a string (like "email already exists")
            setFieldErrors({
              email: errorData.error
            });
          } else if (typeof errorData.error === 'object') {
            // If error is an object with specific field errors
            setFieldErrors(errorData.error);
          }
          
          setMessage({ 
            text: "فشل في تحديث الملف الشخصي", 
            type: "error" 
          });
        } catch {
          console.error("خطأ أثناء تحديث بيانات المستخدم:", error);
          setMessage({ 
            text: "حدث خطأ غير متوقع", 
            type: "error" 
          });
        }
      });
  };
  if (loading) {
    return (
      <div className="profile-container">
        <div className="loading">جارِ التحميل...</div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <h2>ملف المستخدم</h2>

      {message.text && (
  <div className={`profile-message ${message.type}`}>{message.text}</div>
)}
<div className="profile-avatar-container">
  <label htmlFor="image-upload">
    {userData.imageUrl ? (
      <img
        src={userData.imageUrl}
        alt="الملف الشخصي"
        className="profile-avatar"
      />
    ) : (
      <div className="profile-avatar-text">
        {userData.name.charAt(0).toUpperCase()}
      </div>
    )}
    <div className="overlay" /> {/* Overlay effect */}
  </label>
  <input
    type="file"
    id="image-upload"
    name="image"
    accept="image/*"
    onChange={handleChange}
    style={{ display: "none" }}
  />
</div>
      <form onSubmit={handleSubmit} className="profile-form">
        <div className="form-group">
          <label htmlFor="name">الاسم</label>
          <input
            type="text"
            id="name"
            name="name"
            value={userData.name}
            onChange={handleChange}
            required
            disabled={!isAdmin} // Disabled if not an admin
            className={fieldErrors.name ? "error" : ""}
          />
          {fieldErrors.name && (
            <div className="error-message">{fieldErrors.name}</div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="email">البريد الإلكتروني</label>
          <input
            type="email"
            id="email"
            name="email"
            value={userData.email}
            onChange={handleChange}
            required
            disabled={!isAdmin} // Disabled if not an admin
            className={fieldErrors.email ? "error" : ""}
          />
          {fieldErrors.email && (
            <div className="error-message">{fieldErrors.email}</div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="password">كلمة المرور</label>
          <input
            type="password"
            id="password"
            name="password"
            value={userData.password}
            onChange={handleChange}
            placeholder="اتركه فارغاً للحفاظ على كلمة المرور الحالية"
            className={fieldErrors.password ? "error" : ""}
          />
          {fieldErrors.password && (
            <div className="error-message">{fieldErrors.password}</div>
          )}
        </div>

        <button type="submit">تحديث الملف الشخصي</button>
      </form>
      <div className="roles-section">
        <h3>الأدوار الخاصة بك</h3>
        <ul className="roles-list">
          {Array.isArray(roles) && roles.length > 0 ? (
            roles.map((role, index) => (
              <li key={index} className="role-item">
                {role}
              </li>
            ))
          ) : (
            <li className="role-item">لا توجد أدوار مخصصة</li>
          )}
        </ul>
      </div>
    </div>
    
  );
};

export default Profile;

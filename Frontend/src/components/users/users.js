import React, { useState, useEffect, useCallback } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import '../../style/users.css';
import { useNavigate } from 'react-router-dom';
import FileUpload from '.././fileupload'; // Import the FileUpload component

const Users = () => {
  const [users, setUsers] = useState([]);
  const [meta, setMeta] = useState({
    total: 0,
    per_page: 12,
    current_page: 1,
    last_page: 1
  });
  const navigate = useNavigate();
  const [successMessage, setSuccessMessage] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [isFormVisible, setIsFormVisible] = useState(false); // State to control form visibility
  const token = localStorage.getItem("token");
    const [image, setImage] = useState(null);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    image: null,
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);



  const fetchUsers = useCallback(async (page = 1, searchTerm = "") => {
    try {
      const queryParams = new URLSearchParams({
        page: page,
        per_page: 12,
        q: searchTerm,
        sort: `${sortOrder === 'asc' ? '' : '-'}${sortField}`
      });

      const response = await fetch(`http://localhost:8080/users?${queryParams}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error("Failed to fetch users");

      const data = await response.json();
      setUsers(data.users || []);
      setMeta(prevMeta => ({
        ...prevMeta,
        total: data.meta?.total || prevMeta.total,
        per_page: 12,
        current_page: data.meta?.current_page || prevMeta.current_page,
        last_page: data.meta?.last_page || prevMeta.last_page
      }));
    } catch (err) {
      console.error(err);
    }
  }, [token, sortField, sortOrder]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearch = useCallback((e) => {
    const term = e.target.value;
    setSearchTerm(term);
    fetchUsers(1, term);
  }, [fetchUsers]);

  const handleSortChange = useCallback((e) => {
    const [field, order] = e.target.value.split('|');
    setSortField(field);
    setSortOrder(order);
    fetchUsers(1, searchTerm);
  }, [fetchUsers, searchTerm]);

  const getInitials = useCallback((name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }, []);

  const handlePageChange = useCallback((newPage) => {
    fetchUsers(newPage, searchTerm);
  }, [fetchUsers, searchTerm]);
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
  
    let validationErrors = {};
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!formData.name) {
      validationErrors.name = "اسم المستخدم مطلوب";
    } else if (formData.name.length < 3) {
      validationErrors.name = "يجب أن يكون الاسم 3 أحرف على الأقل";
    }
  
    if (!formData.email) {
      validationErrors.email = "البريد الإلكتروني مطلوب";
    } else if (!emailRegex.test(formData.email)) {
      validationErrors.email = "صيغة البريد الإلكتروني غير صحيحة";
    }
  
    if (!formData.password) {
      validationErrors.password = "كلمة المرور مطلوبة";
    } else if (formData.password.length < 6) {
      validationErrors.password = "يجب أن تكون كلمة المرور 6 أحرف على الأقل";
    }
  
    // No need to validate graduation_semester here, just set it to false if not checked

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setIsSubmitting(false);
      return;
    }
    const roleToSubmit = formData.role || "3";

    const data = new FormData();
    data.append("name", formData.name);
    data.append("email", formData.email);
    data.append("password", formData.password);
    data.append("role", roleToSubmit); 

    if (formData.image) {
      data.append("img", formData.image);
    }
  
    try {
      const response = await fetch("http://localhost:8080/signup", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: data,
      });
  
      setIsSubmitting(false);
  
      if (!response.ok) {
        const errorData = await response.json();
  
        // Specific error handling
        let processedErrors = {};
  
        // Handle different error structures
        if (typeof errorData.error === "object") {
          processedErrors = { ...errorData.error };
        } else if (typeof errorData.error === "string") {
          if (errorData.error.includes("email already exists")) {
            processedErrors.email = "البريد الإلكتروني مسجل بالفعل";
          } else if (errorData.error === "Invalid email format") {
            processedErrors.email = "صيغة البريد الإلكتروني غير صحيحة";
          } else {
            processedErrors.general = errorData.error;
          }
        } else {
          processedErrors.general = "حدث خطأ غير متوقع";
        }
  
        setErrors(processedErrors);
        return;
      }
  
      // Success case
      setErrors({});
      setIsFormVisible(false);
      setFormData({
        name: "",
        email: "",
        password: "",
        image: null,
        role: "", 
        graduation_semester: false, // Reset to false
      });
      setSuccessMessage("تم إضافة المستخدم بنجاح!");
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
  
      fetchUsers(); // Refresh user list
    } catch (error) {
      console.error("Error adding user:", error);
      setErrors({ general: "حدث خطأ غير متوقع" });
      setIsSubmitting(false);
    }
};
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: name === 'role' ? (value ? parseInt(value) : "") : value,
    }));
    setErrors((prevErrors) => ({
      ...prevErrors,
      [name]: null,
    }));
  };


return (
  <div className="users-container" dir="rtl">
      <button 
        className="add-user-button" 
        onClick={() => setIsFormVisible(true)}
      >
        إضافة مستخدم
      </button>

{isFormVisible && (
  <div className="overlay">
    <div className="overlaye-content">
      <h2>إضافة مستخدم جديد</h2>
      {errors.general && <div className="error-message">{errors.general}</div>}
      <form onSubmit={handleSubmit}>
  <div className="form-grid">
    <div className="form-column">
      <div className={`form-group ${errors.name ? "error-label" : ""}`}>
        <span>اسم المستخدم</span>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleInputChange}
          className={errors.name ? "error-input" : ""}
          disabled={isSubmitting}
        />
        {errors.name && <div className="error-message">{errors.name}</div>}
      </div>

      <div className={`form-group ${errors.email ? "error-label" : ""}`}>
        <span>البريد الإلكتروني</span>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleInputChange}
          className={errors.email ? "error-input" : ""}
        />
        {errors.email && <div className="error-message">{errors.email}</div>}
      </div>

      <div className={`form-group ${errors.password ? "error-label" : ""}`}>
        <span>كلمة المرور</span>
        <input
          type="password"
          name="password"
          value={formData.password}
          onChange={handleInputChange}
          className={errors.password ? "error-input" : ""}
          disabled={isSubmitting}
        />
        {errors.password && <div className="error-message">{errors.password}</div>}
      </div>
    </div>


    <div className="form-group">
  <span>الدور</span>
  <select
    name="role"
    value={formData.role}
    onChange={handleInputChange}
    className="role-select"
  >
    <option value="3">اختر الدور</option>
    <option value="1">مدير</option>
    <option value="2">معلم</option>
    <option value="3">طالب</option>
    <option value="4">طالب تخرج</option>
    <option value="5">طالب متخرج</option>


  </select>
  {errors.role && <div className="error-message">{errors.role}</div>}
</div>
    <div className="form-column">
      <div className="form-group">
            <FileUpload file={image} onFileChange={setImage} label="اختر صورة" acceptImages={true} />
          </div>
    </div>
  </div>

  <div className="form-actions">
    <button type="submit" disabled={isSubmitting}>
      {isSubmitting ? "جاري الإضافة..." : "إضافة مستخدم"}
    </button>
    <button type="button" onClick={() => setIsFormVisible(false)} disabled={isSubmitting} className="cancel-button">
      إلغاء
    </button>
  </div>
</form>

    </div>
  </div>
)}
   {successMessage && (
  <div className="success-message">
    {successMessage}
  </div>
)}
    <div className="controls">
      <input
        type="text"
        placeholder="البحث عن المستخدمين..."
        value={searchTerm}
        onChange={handleSearch}
        className="search-input"
      />

      <select 
        onChange={handleSortChange} 
        value={`${sortField}|${sortOrder}`} 
        className="sort-select"
      >
        <option value="name|asc">ترتيب حسب الاسم (أ إلى ي)</option>
        <option value="name|desc">ترتيب حسب الاسم (ي إلى أ)</option>
        <option value="created_at|asc">ترتيب حسب تاريخ الإنشاء (الأقدم إلى الأحدث)</option>
        <option value="created_at|desc">ترتيب حسب تاريخ الإنشاء (الأحدث إلى الأقدم)</option>
      </select>
    </div>

    <div className="users-grid">
      {users.map((user) => (
        <div 
          key={user.id} 
          className="user-card" 
          onClick={() => navigate(`/users/${user.id}`)}
          style={{ cursor: 'pointer' }}
        >
          {user.image ? (
            <img 
              src={user.image} 
              alt={user.name} 
              className="user-avatar" 
            />
          ) : (
            <div className="user-avatar-placeholder">
              {getInitials(user.name)}
            </div>
          )}
          <div className="user-name">{user.name}</div>
          <div className="user-email">{user.email}</div>
          <div className="user-created">
            تم الإنشاء: {new Date(user.created_at).toLocaleDateString()}
          </div>
        </div>
      ))}
    </div>

    <div className="pagination">
      <button 
        onClick={() => handlePageChange(meta.current_page - 1)} 
        disabled={meta.current_page === 1}
      >
        <FaChevronRight />
        السابق
      </button>
      <span>
        الصفحة {meta.current_page} من {meta.last_page}
      </span>
      <button 
        onClick={() => handlePageChange(meta.current_page + 1)} 
        disabled={meta.current_page === meta.last_page}
      >
        التالي  <FaChevronLeft />
      </button>
    </div>
  </div>
);
}

export default Users;
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaEnvelope, FaUser, FaCalendar, FaEdit, FaTrash ,FaLock} from 'react-icons/fa';
import '../../style/userdetails.css';

const UserDetails = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [roleChanges, setRoleChanges] = useState({ add: [], remove: [] });

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    username: '',
    password: '', 
    image: null,
    imageUrl: '',
    roles: [],
  });
  
  const [message, setMessage] = useState({ text: '', type: '' });
  const { id } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  // Role configuration
  const ROLES = {
    student: { value: 'student', label: 'طالب', id: '3' },
    teacher: { value: 'teacher', label: 'معلم', id: '2' },
    admin: { value: 'admin', label: 'مدير', id: '1' },
    graduation_student: { value: 'graduation_student', label: 'طالب تخرج', id: '4' }, 
    graduated_student: { value: 'graduated_student', label: 'طالب متخرج', id: '5' } 

  };
  
  const fetchUserDetails = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:8080/users/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
  
      if (!response.ok) {
        throw new Error('فشل في جلب تفاصيل المستخدم');
      }
  
      const data = await response.json();
      setUser(data.user);
      setFormData({
        name: data.user.name,
        email: data.user.email,
        username: data.user.username,
        image: null,
        imageUrl: data.user.image || '',
        roles: data.user.roles || []
      });
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }, [id, token]);

  useEffect(() => {
    fetchUserDetails();
  }, [fetchUserDetails]);

  const handleRoleToggle = (role) => {
    setFormData((prev) => {
      // Create a copy of the current roles
      let currentRoles = [...prev.roles];
      const roleValue = role.value;
  
      // Define conflicting roles for each role
      const conflictMap = {
        student: ["admin", "teacher", "graduation_student", "graduated_student"],
        graduation_student: ["student", "admin", "teacher", "graduated_student"],
        graduated_student: ["student", "admin", "teacher", "graduation_student"],
        admin: ["student", "graduation_student", "graduated_student"],
        teacher: ["student", "graduation_student", "graduated_student"],
      };
  
      // Toggle the role: if it's already selected, remove it.
      if (currentRoles.includes(roleValue)) {
        currentRoles = currentRoles.filter((r) => r !== roleValue);
      } else {
        // Otherwise, add the role.
        currentRoles.push(roleValue);
        // Remove any roles that conflict with the newly added role.
        if (conflictMap[roleValue]) {
          currentRoles = currentRoles.filter(
            (r) => !conflictMap[roleValue].includes(r)
          );
        }
      }
  
      return { ...prev, roles: currentRoles };
    });
  };
  
  const handleRoleUpdates = async () => {
    try {
      const userId = user?.id || id;
      if (!userId) {
        throw new Error("No valid user ID found");
      }
  
      // Prepare role changes for backend
      const rolesToAdd = formData.roles.filter((role) => !user.roles.includes(role));
      const rolesToRemove = user.roles.filter((role) => !formData.roles.includes(role));
  
      // Process role removals
      for (const roleToRemove of rolesToRemove) {
        const roleId = ROLES[roleToRemove]?.id;
        if (roleId) {
          const formDataObj = new FormData();
          formDataObj.append('user_id', userId);
          formDataObj.append('role_id', roleId);
  
          const response = await fetch(`http://localhost:8080/roles/revoke`, {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formDataObj,
          });
  
          if (!response.ok) {
            throw new Error(`فشل في إزالة دور ${ROLES[roleToRemove].label}`);
          }
        }
      }
  
      // Process role additions
      for (const roleToAdd of rolesToAdd) {
        const roleId = ROLES[roleToAdd]?.id;
        if (roleId) {
          const formDataObj = new FormData();
          formDataObj.append('user_id', userId);
          formDataObj.append('role_id', roleId);
  
          const response = await fetch(`http://localhost:8080/roles/grant`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formDataObj,
          });
  
          if (!response.ok) {
            throw new Error(`فشل في إضافة دور ${ROLES[roleToAdd].label}`);
          }
        }
      }

      // Reset states and refresh data
      await fetchUserDetails();
      setRoleChanges({ add: [], remove: [] });
      setIsEditing(false);
      setMessage({
        text: 'تم تحديث الأدوار بنجاح',
        type: 'success'
      });
    } catch (err) {
      console.error("Role Update Error:", err);
      setMessage({
        text: err.message || 'حدث خطأ في تحديث الأدوار',
        type: 'error'
      });
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          image: file,
          imageUrl: reader.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('هل أنت متأكد أنك تريد حذف هذا المستخدم؟')) {
      try {
        const response = await fetch(`http://localhost:8080/users/${id}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (!response.ok) throw new Error('فشل في حذف المستخدم');
        navigate('/users');
      } catch (err) {
        setError(err.message);
      }
    }
  };

  const getInitials = (name) => {
    return name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : '';
  };

  const getRoleStatus = (roleValue) => {
    const hasRole = formData.roles.includes(roleValue);
    const isBeingAdded = roleChanges.add.includes(roleValue);
    const isBeingRemoved = roleChanges.remove.includes(roleValue);

    if (isBeingAdded) return { class: 'adding', symbol: '+' };
    if (isBeingRemoved) return { class: 'removing', symbol: '-' };
    if (hasRole) return { class: 'current', symbol: '✓' };
    return { class: 'inactive', symbol: '+' };
  };

  const handleBack = () => navigate('/users');
  const handleInputChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };
 
const handleUpdate = async () => {
  try {
    const userId = user?.id || id;
    if (!userId) {
      throw new Error("No valid user ID found");
    }

    // Create FormData for sending updates
    const updateData = new FormData();
    
    // Add name if changed
    if (formData.name !== user.name) {
      updateData.append('name', formData.name);
    }
    
    // Add email if changed
    if (formData.email !== user.email) {
      updateData.append('email', formData.email);
    }
    
    // Add password if provided
    if (formData.password) {
      updateData.append('password', formData.password);
    }
    
    // Add image if changed
    if (formData.image) {
      updateData.append('image', formData.image);
    }

    // Send update request
    const response = await fetch(`http://localhost:8080/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: updateData
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'فشل تحديث المستخدم');
    }

    // Process role updates (keep your existing role update logic)
    await handleRoleUpdates();

    // Refresh user details
    await fetchUserDetails();

    // Reset states
    setIsEditing(false);
    setMessage({
      text: 'تم تحديث المستخدم بنجاح',
      type: 'success'
    });
  } catch (err) {
    console.error("Update Error:", err);
    setMessage({
      text: err.message || 'حدث خطأ في التحديث',
      type: 'error'
    });
  }
};

  return (
    <div className="user-details-container" dir="rtl">
      {message.text && (
        <div 
          className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-danger'}`}
        >
          {message.text}
        </div>
      )}
  
      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>جاري التحميل...</p>
        </div>
      ) : error ? (
        <div className="error-container">
          <p>حدث خطأ: {error}</p>
          <button onClick={handleBack} className="back-button">
            <FaArrowLeft /> العودة
          </button>
        </div>
      ) : (
        <>
          <button onClick={handleBack} className="back-button">
            <FaArrowLeft /> العودة إلى المستخدمين
          </button>
  
          <div className="user-details-card">
          <div className="user-details-header">
  {isEditing ? (
    <div className="profile-avatar-container">
      <label htmlFor="image-upload">
        {formData.imageUrl || user?.image ? (
          <img
            src={formData.imageUrl || user?.image}
            alt={user?.name || 'المستخدم'}
            className="user-details-avatar"
          />
        ) : (
          <div className="user-details-avatar-placeholder">
            {getInitials(user?.name || '')}
          </div>
        )}
        <div className="overlay" />
      </label>
      <input
        type="file"
        id="image-upload"
        name="image"
        accept="image/*"
        onChange={handleImageChange}
        style={{ display: "none" }}
      />
    </div>
  ) : (
    formData.imageUrl || user?.image ? (
      <img
        src={formData.imageUrl || user?.image}
        alt={user?.name || 'المستخدم'}
        className="user-details-avatar"
      />
    ) : (
      <div className="user-details-avatar-placeholder">
        {getInitials(user?.name || '')}
      </div>
    )
  )}
              <h2>{user?.name || 'اسم المستخدم'}</h2>
            </div>
  
            <div className="user-details-info">
              <div className="info-item">
                {isEditing ? (
                  <>
                    <FaUser  className="info-icon" />
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="edit-input"
                      placeholder="اسم المستخدم"
                    />
                  </>
                ) : (
                  <>
                    <FaUser  className="info-icon" />
                    <span>اسم المستخدم: {user?.name || 'غير محدد'}</span>
                  </>
                )}
              </div>
  
              <div className="info-item">
                {isEditing ? (
                  <>
                    <FaEnvelope className="info-icon" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="edit-input"
                      placeholder="البريد الإلكتروني"
                    />
                  </>
                ) : (
                  <>
                    <FaEnvelope className="info-icon" />
                    <span>البريد الإلكتروني: {user?.email || 'غير محدد'}</span>
                  </>
                )}
              </div>
  
              <div className="info-item">
                <FaCalendar className="info-icon" />
                <span>
                  تاريخ الإنشاء: {user?.created_at ? new Date(user.created_at).toLocaleDateString('ar-EG') : 'غير محدد'}
                </span>
              </div>
  
         
  
              <div className="info-item">
        {isEditing ? (
          <div className="roles-management-enhanced">
            <div className="current-roles-section">
              <h4>الأدوار</h4>
              <div className="current-roles-grid">
                {Object.values(ROLES).map((role) => {
                  const status = getRoleStatus(role.value);
                  return (
                    <div
                      key={role.value}
                      className={`role-chip ${status.class}`}
                      onClick={() => handleRoleToggle(role)}
                    >
                      <span className="role-label">{role.label}</span>
                      <span className="role-status">{status.symbol}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <span>
            الأدوار: {formData?.roles?.map((role) => ROLES[role]?.label).join(' | ') || 'لا توجد أدوار'}
          </span>
        )}
      </div>
</div>  
<div className="info-item">
      <FaLock className="info-icon" />
      <input
        type="password"
        name="password"
        value={formData.password}
        onChange={handleInputChange}
        className="edit-input"
        placeholder="كلمة المرور الجديدة (اختياري)"
      />
    </div>
            <div className="action-buttons">
              {isEditing ? (
                <>
                  <button className="update-button" onClick={handleUpdate}>
                    <FaEdit /> حفظ التغييرات
                  </button>
                  <button className="delete-button" onClick={() => setIsEditing(false)}>
                    إلغاء
                  </button>
                </>
              ) : (
                <>
                  <button className="update-button" onClick={() => setIsEditing(true)}>
                    <FaEdit /> تعديل المستخدم
                  </button>
                  <button className="delete-buttons" onClick={handleDelete}>
                    <FaTrash /> حذف المستخدم
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default UserDetails;
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail } from 'lucide-react';
import '../../style/login.css';
import FileUpload from '../fileupload';

function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [image, setImage] = useState(null);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const navigate = useNavigate();

  const handleSignup = async (event) => {
    event.preventDefault();
    setErrors({});
    setSuccessMessage('');

    // Frontend validation
    const newErrors = {};

    if (!name.trim()) {
      newErrors.name = 'الاسم مطلوب';
    } else if (name.length < 3) {
      newErrors.name = 'يجب أن يتكون الاسم من 3 أحرف على الأقل';
    } else if (name.length > 100) {
      newErrors.name = 'يجب أن يكون الاسم أقل من 100 حرف';
    }

    if (!email.trim()) {
      newErrors.email = 'البريد الإلكتروني مطلوب';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'تنسيق البريد الإلكتروني غير صالح';
    } else if (!/@uob\.edu\.ly$/.test(email)) {
      newErrors.email = 'يجب أن يكون البريد الإلكتروني من نطاق uob.edu.ly';
    }

    if (!password) {
      newErrors.password = 'كلمة المرور مطلوبة';
    } else if (password.length < 8) {
      newErrors.password = 'كلمة المرور قصيرة جداً';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('email', email);
      formData.append('password', password);
      if (image) formData.append('image', image);

      const response = await fetch('http://localhost:8080/signup', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage('تم إنشاء الحساب بنجاح. الرجاء التحقق من بريدك الإلكتروني.');
        setTimeout(() => navigate('/verify-email', { state: { email } }), 2000);
      } else {
      
        if (data.errors) {
          setErrors(data.errors);
        } else if (data.error) {
          setErrors({ general: data.error });
        } else {
          setErrors({ general: 'حدث خطأ أثناء إنشاء الحساب' });
        }
      }
    } catch (error) {
      setErrors({ general: 'فشل الاتصال بالخادم' });
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <Mail className="mail-icon" size={32} />
          <h1>إنشاء حساب جديد</h1>
          <p>املأ التفاصيل أدناه لإنشاء حسابك</p>
        </div>

        <form onSubmit={handleSignup} className="login-form">
          <div className="form-group">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="الاسم"
              className={`input-field ${errors.name ? 'input-error' : ''}`}
            />
            {errors.name && <div className="field-error">{errors.name}</div>}
          </div>

          <div className="form-group">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="البريد الإلكتروني"
              className={`input-field ${errors.email ? 'input-error' : ''}`}
            />
            {errors.email && <div className="field-error">{errors.email}</div>}
          </div>

          <div className="form-group">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="كلمة المرور"
              className={`input-field ${errors.password ? 'input-error' : ''}`}
            />
            {errors.password && <div className="field-error">{errors.password}</div>}
          </div>

          <div className="form-group">
            <FileUpload file={image} onFileChange={setImage} label="اختر صورة" acceptImages={true} />
          </div>

          {errors.general && (
            <div className="error-message">
              {errors.general}
            </div>
          )}

          {successMessage && (
            <div className="success-message">
              {successMessage}
            </div>
          )}

          <button type="submit" className="login-button">
            إنشاء حساب
          </button>
        </form>

        <div className="signup-prompt">
          <p>لديك حساب بالفعل؟ <span onClick={() => navigate('/login')} className="signup-link">تسجيل الدخول</span></p>
        </div>
      </div>
    </div>
  );
}

export default Signup;
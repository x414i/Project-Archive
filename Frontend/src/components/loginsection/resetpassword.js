import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Lock } from 'lucide-react';
import '../../style/login.css';

function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  // Extract email from navigation state
  const email = location.state?.email;
  const verificationCode = location.state?.verification_code;

  // Redirect if no email or verification code
  useEffect(() => {
    if (!email || !verificationCode) {
      navigate('/request-reset-password');
    }
  }, [email, verificationCode, navigate]);

  // If no email or verification code, return null
  if (!email || !verificationCode) {
    return null;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();

    setErrorMessage('');
    setSuccessMessage('');

    // Validate password
    if (!password || !confirmPassword) {
      setErrorMessage('كلمة المرور مطلوبة');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('كلمات المرور غير متطابقة');
      return;
    }

    // Optional: Add password strength validation
    if (password.length < 6) {
      setErrorMessage('يجب أن تتكون كلمة المرور من 6 أحرف على الأقل');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('email', email); // Received from previous page
      formData.append('verification_code', verificationCode); // Received from previous page
      formData.append('new_password', password);

      const response = await fetch('http://localhost:8080/password-reset', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage('تم إعادة تعيين كلمة المرور بنجاح!');
        setTimeout(() => navigate('/login'), 2000);
      } else {
        if (data.error === "رمز التحقق منتهي الصلاحية") {
          // If the verification code has expired, redirect to the VerifyResetCode page with the email
          setErrorMessage('رمز التحقق منتهي الصلاحية');
          navigate('/verify-reset-code', {
            state: {
              email, // Pass the email back to the VerifyResetCode page
            },
          });
        } else {
          setErrorMessage(data.error || 'فشل في إعادة تعيين كلمة المرور');
        }
      }
    } catch (error) {
      setErrorMessage('فشل الاتصال بالخادم');
    }
};




  const isError = !!errorMessage;

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <Lock className="mail-icon" size={32} />
          <h1>إعادة تعيين كلمة المرور</h1>
          <p>أدخل كلمة المرور الجديدة</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="كلمة المرور الجديدة"
              className={`input-field ${isError ? 'input-error' : ''}`}
            />
          </div>
          <div className="form-group">
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="تأكيد كلمة المرور"
              className={`input-field ${isError ? 'input-error' : ''}`}
            />
          </div>

          {errorMessage && (
            <div className="error-message">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="success-message">
              {successMessage}
            </div>
          )}

          <button type="submit" className="login-button">إعادة تعيين كلمة المرور</button>
        </form>
      </div>
    </div>
  );
}

export default ResetPassword;
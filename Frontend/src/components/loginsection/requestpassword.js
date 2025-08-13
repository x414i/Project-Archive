import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Sparkles } from 'lucide-react';
import '../../style/login.css';

function RequestResetPassword() {
  const [email, setEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      return 'البريد الإلكتروني مطلوب';
    }
    if (!emailRegex.test(email)) {
      return 'يرجى إدخال بريد إلكتروني صالح';
    }
    return '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    // Prevent multiple submissions
    if (isSubmitting) return;

    // Reset messages
    setErrorMessage('');
    setSuccessMessage('');

    // Validate email
    const emailError = validateEmail(email);
    if (emailError) {
      setErrorMessage(emailError);
      return;
    }

    // Set submitting state
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('email', email);

      const response = await fetch('http://localhost:8080/password-reset/request', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage('تم إرسال رمز إعادة تعيين كلمة المرور');
          navigate('/verify-reset-code', { 
            state: { 
              email, 
            } 
          });
      } else {
        setErrorMessage(data.error || 'حدث خطأ أثناء طلب إعادة تعيين كلمة المرور');
      }
    } catch (error) {
      setErrorMessage('فشل الاتصال بالخادم');
    } finally {
      // Reset submitting state
      setIsSubmitting(false);
    }
  };

  const isError = !!errorMessage;

  // If submitting, show loading component
  if (isSubmitting) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="loading-container">
            <Sparkles className="loading-icon" />
            <span>جاري التحميل...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <Mail className="mail-icon" size={32} />
          <h1>إعادة تعيين كلمة المرور</h1>
          <p>أدخل بريدك الإلكتروني لإرسال رمز إعادة التعيين</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="البريد الإلكتروني"
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

          <button type="submit" className="login-button">إرسال</button>
        </form>
      </div>
    </div>
  );
}

export default RequestResetPassword;
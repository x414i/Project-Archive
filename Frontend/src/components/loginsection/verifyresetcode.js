import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, RefreshCw } from 'lucide-react';
import '../../style/login.css';

function VerifyResetCode() {
  const [verificationCode, setVerificationCode] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isResendDisabled, setIsResendDisabled] = useState(true);
  const [resendCountdown, setResendCountdown] = useState(300);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const email = location.state?.email;
  const navigationMessage = location.state?.message;

  // Handle success or error message from the location state
  useEffect(() => {
    if (navigationMessage) {
      setSuccessMessage(navigationMessage);
      if (navigationMessage === 'رمز التحقق منتهي الصلاحية') {
        setErrorMessage('رمز التحقق منتهي الصلاحية. الرجاء طلب رمز جديد.');
        setIsResendDisabled(false);
      }
    }
  }, [navigationMessage]);

  // Check for missing email and navigate back
  useEffect(() => {
    if (!email) {
      navigate('/reset-password');
    }
  }, [email, navigate]);

  // Automatically disable the resend button and start the countdown when the component mounts
  useEffect(() => {
    setIsResendDisabled(true); // Disable resend button
    setResendCountdown(300); // Set countdown for 5 minutes
  }, []); // Only run once on mount

  // Handle countdown timer for resend button
  useEffect(() => {
    let timer;
    if (resendCountdown > 0) {
      timer = setInterval(() => {
        setResendCountdown(prev => {
          if (prev <= 1) {
            // When countdown reaches 0, enable the button
            setIsResendDisabled(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(timer); // Clear the interval on cleanup
  }, [resendCountdown]);

  // Prevent render if email is missing
  if (!email) {
    return null;
  }

  // Format countdown into minutes and seconds
  const formatCountdown = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  // Helper function to encode form data
  const encodeFormData = (data) => {
    return Object.keys(data)
      .map(key => encodeURIComponent(key) + '=' + encodeURIComponent(data[key]))
      .join('&');
  };

  // Handle verification code submission
  const handleVerify = async (event) => {
    event.preventDefault();

    setErrorMessage('');
    setSuccessMessage('');

    if (!verificationCode) {
      setErrorMessage('رمز التحقق مطلوب');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('http://localhost:8080/password-reset/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: encodeFormData({
          email,
          verification_code: verificationCode,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage('تم التحقق من رمز إعادة التعيين');
        setTimeout(() => {
          navigate('/reset-password', {
            state: {
              email,
              verification_code: verificationCode,
            },
          });
        }, 2000);
      } else {
        setErrorMessage(data.error || 'رمز التحقق غير صحيح');
      }
    } catch (error) {
      setErrorMessage('فشل الاتصال بالخادم');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle resend request
  const handleResend = async () => {
    setIsResending(true);
    setIsResendDisabled(true);
    setResendCountdown(300);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await fetch('http://localhost:8080/password-reset/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: encodeFormData({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage('تم إرسال رمز إعادة التعيين الجديد');
      } else {
        setErrorMessage(data.error || 'فشل في إرسال رمز إعادة التعيين');
        setIsResendDisabled(false);
        setResendCountdown(0);
      }
    } catch (error) {
      setErrorMessage('فشل الاتصال بالخادم');
      setIsResendDisabled(false);
      setResendCountdown(0);
    } finally {
      setIsResending(false);
    }
  };

  const isError = !!errorMessage;

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <Mail className="mail-icon" size={32} />
          <h1>تحقق من رمز إعادة التعيين</h1>
          <p>تم إرسال رمز إعادة التعيين إلى: {email}</p>
        </div>

        <form onSubmit={handleVerify} className="login-form">
          <div className="form-group">
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              placeholder="رمز التحقق"
              className={`input-field ${isError ? 'input-error' : ''}`}
              disabled={isSubmitting}
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

          <button 
            type="submit" 
            className="login-button"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'جاري التحقق...' : 'تحقق'}
          </button>
        </form>

        <div className="signup-prompt">
          <button 
            onClick={handleResend} 
            disabled={isResendDisabled || isResending}
            className={`signup-link ${isResendDisabled || isResending ? 'disabled-link' : ''}`}
            style={{ 
              width: '100%', 
              padding: '10px', 
              marginTop: '10px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              gap: '10px'
            }}
          >
            <RefreshCw size={20} />
            {isResendDisabled || isResending
              ? `إعادة إرسال رمز التحقق (${formatCountdown(resendCountdown)})` 
              : 'إعادة إرسال رمز التعيين'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default VerifyResetCode;
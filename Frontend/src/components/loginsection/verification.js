import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, RefreshCw } from 'lucide-react';
import '../../style/login.css';

function VerifyEmail() {
  const [verificationCode, setVerificationCode] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isResendDisabled, setIsResendDisabled] = useState(true);
  const [resendCountdown, setResendCountdown] = useState(300);
  const navigate = useNavigate();
  const location = useLocation();

  // Extract email and optional message from navigation state
  const email = location.state?.email;
  const navigationMessage = location.state?.message;

  // Start countdown and disable resend button when page loads
  useEffect(() => {
    // Set initial countdown to 5 minutes
    setIsResendDisabled(true);
    setResendCountdown(300);
  }, []);

  // Set navigation message as initial success message if exists
  useEffect(() => {
    if (navigationMessage) {
      setSuccessMessage(navigationMessage);
    }
  }, [navigationMessage]);

  // Countdown timer for resend button
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

    return () => clearInterval(timer);
  }, [resendCountdown]);

  // If no email is passed, redirect to login
  useEffect(() => {
    if (!email) {
      navigate('/login');
    }
  }, [email, navigate]);

  // If no email, return null to prevent rendering
  if (!email) {
    return null;
  }

  // Format countdown to MM:SS
  const formatCountdown = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  const encodeFormData = (data) => {
    return Object.keys(data)
      .map(key => encodeURIComponent(key) + '=' + encodeURIComponent(data[key]))
      .join('&');
  };

  const handleVerify = async (event) => {
    event.preventDefault();

    // Reset messages
    setErrorMessage('');
    setSuccessMessage('');

    if (!verificationCode) {
      setErrorMessage('رمز التحقق مطلوب');
      return;
    }

    try {
      const response = await fetch('http://localhost:8080/verifyemail', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: encodeFormData({ 
          email, 
          verification_code: verificationCode 
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage('تم التحقق من بريدك الإلكتروني بنجاح!');
        setTimeout(() => navigate('/login'), 2000);
      } else {
        setErrorMessage(data.error || 'رمز التحقق غير صحيح أو منتهي الصلاحية');
      }
    } catch (error) {
      setErrorMessage('فشل الاتصال بالخادم');
    }
  };

  const handleResend = async () => {
    // Disable resend button and start countdown
    setIsResendDisabled(true);
    setResendCountdown(300); // 5 minutes (300 seconds)
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await fetch('http://localhost:8080/resendverification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: encodeFormData({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage('تم إرسال رمز التحقق الجديد إلى بريدك الإلكتروني');
      } else {
        setErrorMessage(data.error || 'فشل في إرسال رمز التحقق');
        // Reset disable state if there's an error
        setIsResendDisabled(false);
        setResendCountdown(0);
      }
    } catch (error) {
      setErrorMessage('فشل الاتصال بالخادم');
      setIsResendDisabled(false);
      setResendCountdown(0);
    }
  };

  const isError = !!errorMessage;

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <Mail className="mail-icon" size={32} />
          <h1>تحقق من بريدك الإلكتروني</h1>
          <p>تم إرسال رمز التحقق إلى: {email}</p>
        </div>

        <form onSubmit={handleVerify} className="login-form">
          <div className="form-group">
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              placeholder="رمز التحقق"
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

          <button type="submit" className="login-button">تحقق</button>
        </form>

        {/* Resend Verification Button */}
        <div className="signup-prompt">
          <button 
            onClick={handleResend} 
            disabled={isResendDisabled}
            className={`signup-link ${isResendDisabled ? 'disabled-link' : ''}`}
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
            {isResendDisabled 
              ? `إعادة إرسال رمز التحقق (${formatCountdown(resendCountdown)})` 
              : 'إعادة إرسال رمز التحقق'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default VerifyEmail;
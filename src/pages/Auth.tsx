import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../services/supabase';
import './Auth.css';

type AuthMode = 'signIn' | 'signUp' | 'forgotPassword';

const Auth: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('signIn');
  const [error, setError] = useState<string | null>(null);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  useEffect(() => {
    const mode = searchParams.get('mode') as AuthMode | null;
    if (mode && ['signIn', 'signUp', 'forgotPassword'].includes(mode)) {
      setAuthMode(mode);
    }
    setError(null);
  }, [searchParams]);

  const handleSignIn = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError(signInError.message);
        console.error('Sign In Error:', signInError.message);
      } else {
        alert('Success: Logged in successfully!');
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during sign in.');
      console.error('Unexpected Sign In Error:', err);
    } finally {
      setLoading(false);
    }
  }, [email, password, navigate]);

  const handleSignUp = useCallback(async () => {
    setError(null);
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const { error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) {
        setError(signUpError.message);
        console.error('Sign Up Error:', signUpError.message);
      } else {
        alert('Success: Account created! Please check your email to confirm your account.');
        setAuthMode('signIn');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during sign up.');
      console.error('Unexpected Sign Up Error:', err);
    } finally {
      setLoading(false);
    }
  }, [email, password, confirmPassword]);

  const handleForgotPassword = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (resetError) {
        setError(resetError.message);
        console.error('Forgot Password Error:', resetError.message);
      } else {
        alert('Password Reset: Check your email for the password reset link!');
        setAuthMode('signIn');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during password reset.');
      console.error('Unexpected Forgot Password Error:', err);
    } finally {
      setLoading(false);
    }
  }, [email]);

  const renderAuthForm = () => {
    return (
      <div className="auth-card">
        <h2 className="auth-title">
          {authMode === 'signIn' ? 'Welcome Back' : authMode === 'signUp' ? 'Join Ogonjo' : 'Reset Your Password'}
        </h2>
        <p className="auth-subtitle">
          {authMode === 'signIn' ? 'Sign in to access your account' : authMode === 'signUp' ? 'Create a new account' : 'Enter your email to reset your password'}
        </p>

        {error && (
          <div className="error-box">
            <p className="error-text">{error}</p>
          </div>
        )}

        <div className="input-group">
          <div className="input-with-icon">
            <svg className="input-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#b0c4de" strokeWidth="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
              <path d="M22 6l-10 7L2 6"></path>
            </svg>
            <input
              className="auth-input"
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          {(authMode === 'signIn' || authMode === 'signUp') && (
            <div className="input-with-icon">
              <svg className="input-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#b0c4de" strokeWidth="2">
                <path d="M12 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5z"></path>
              </svg>
              <input
                className="auth-input"
                type={passwordVisible ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
              <button
                className="password-toggle"
                onClick={() => setPasswordVisible(!passwordVisible)}
              >
                <svg className={`w-5 h-5 ${passwordVisible ? 'text-gray-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={passwordVisible ? "M12 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5z" : "M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zm0 12c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"}></path>
                </svg>
              </button>
            </div>
          )}

          {authMode === 'signUp' && (
            <div className="input-with-icon">
              <svg className="input-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#b0c4de" strokeWidth="2">
                <path d="M12 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5z"></path>
              </svg>
              <input
                className="auth-input"
                type={confirmPasswordVisible ? 'text' : 'password'}
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
              />
              <button
                className="password-toggle"
                onClick={() => setConfirmPasswordVisible(!confirmPasswordVisible)}
              >
                <svg className={`w-5 h-5 ${confirmPasswordVisible ? 'text-gray-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={confirmPasswordVisible ? "M12 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5z" : "M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zm0 12c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"}></path>
                </svg>
              </button>
            </div>
          )}

          {authMode === 'signIn' && (
            <button
              className="forgot-password-link"
              onClick={() => setAuthMode('forgotPassword')}
            >
              Forgot Password?
            </button>
          )}

          <button
            className="auth-button"
            onClick={
              authMode === 'signIn'
                ? handleSignIn
                : authMode === 'signUp'
                ? handleSignUp
                : handleForgotPassword
            }
            disabled={loading}
          >
            {loading ? (
              <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              authMode === 'signIn' ? 'Sign In' : authMode === 'signUp' ? 'Sign Up' : 'Reset Password'
            )}
          </button>

          <div className="mode-switch">
            {authMode === 'signIn' ? (
              <p className="mode-text">
                Don't have an account?{' '}
                <span className="mode-link" onClick={() => setAuthMode('signUp')}>
                  Sign Up
                </span>
              </p>
            ) : authMode === 'signUp' ? (
              <p className="mode-text">
                Already have an account?{' '}
                <span className="mode-link" onClick={() => setAuthMode('signIn')}>
                  Sign In
                </span>
              </p>
            ) : (
              <p className="mode-text">
                Remembered your password?{' '}
                <span className="mode-link" onClick={() => setAuthMode('signIn')}>
                  Sign In
                </span>
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="auth-wrapper relative z-30">
      <div className="logo-section">
        <svg className="logo-icon" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--theme-color-secondary)" strokeWidth="2">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
        </svg>
        <h1 className="logo-text">OGONJO</h1>
        <p className="tagline">Your Premier Business Growth Partner</p>
      </div>
      {renderAuthForm()}
    </div>
  );
};

export default Auth;
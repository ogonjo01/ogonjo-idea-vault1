// src/components/AuthForm/AuthForm.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase/supabaseClient";
import "./AuthForm.css";

const AuthForm = () => {
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("login"); // "login" | "signup" | "forgot" | "reset"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetToken, setResetToken] = useState(null);
  const navigate = useNavigate();

  // Listen for Supabase auth events
  useEffect(() => {
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setMode("reset"); // Show reset password form
      }
    });

    // Check URL for recovery token
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("access_token");
    if (token) {
      setResetToken(token);
      setMode("reset");
    }
  }, []);

  // Handle Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate("/");
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle Signup
  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      alert("Signup successful! Check your email for confirmation.");
      setMode("login");
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle Forgot Password (send reset email)
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
      alert("Password reset link sent! Check your email.");
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle Reset Password (after clicking email link)
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      alert("Password successfully updated! Please login.");
      setPassword("");
      setMode("login");
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <h2 className="auth-title">
        {mode === "login" && "Login"}
        {mode === "signup" && "Sign Up"}
        {mode === "forgot" && "Reset Password"}
        {mode === "reset" && "Set New Password"}
      </h2>

      <form
        onSubmit={
          mode === "login"
            ? handleLogin
            : mode === "signup"
            ? handleSignup
            : mode === "forgot"
            ? handleForgotPassword
            : handleResetPassword
        }
      >
        {(mode === "login" || mode === "signup" || mode === "forgot") && (
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="auth-input"
            required
          />
        )}

        {(mode === "login" || mode === "signup" || mode === "reset") && (
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="auth-input"
            required
          />
        )}

        <button type="submit" className="auth-button" disabled={loading}>
          {loading
            ? "Processing..."
            : mode === "login"
            ? "Login"
            : mode === "signup"
            ? "Sign Up"
            : mode === "forgot"
            ? "Send Reset Link"
            : "Update Password"}
        </button>
      </form>

      <div className="auth-switch">
        {mode === "login" && (
          <>
            <p>
              Don’t have an account?{" "}
              <button onClick={() => setMode("signup")}>Sign Up</button>
            </p>
            <p>
              Forgot password?{" "}
              <button onClick={() => setMode("forgot")}>Reset</button>
            </p>
          </>
        )}
        {mode === "signup" && (
          <p>
            Already have an account?{" "}
            <button onClick={() => setMode("login")}>Login</button>
          </p>
        )}
        {mode === "forgot" && (
          <p>
            Remembered your password?{" "}
            <button onClick={() => setMode("login")}>Back to Login</button>
          </p>
        )}
        {mode === "reset" && (
          <p>
            Want to go back?{" "}
            <button onClick={() => setMode("login")}>Back to Login</button>
          </p>
        )}
      </div>
    </div>
  );
};

export default AuthForm;

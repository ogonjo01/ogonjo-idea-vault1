// src/pages/ResetPassword.jsx
import React, { useState, useEffect } from "react";
import { supabase } from "../supabase/supabaseClient"; // make sure path is correct
import { useNavigate } from "react-router-dom";

const ResetPassword = () => {
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [accessToken, setAccessToken] = useState(null);
  const [email, setEmail] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    // Parse URL parameters
    const params = new URLSearchParams(window.location.search);
    const token = params.get("access_token");
    const userEmail = params.get("email");

    if (!token) {
      alert("Invalid password reset link.");
      return;
    }

    setAccessToken(token);
    if (userEmail) setEmail(userEmail);
  }, []);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!password) return alert("Please enter a new password.");
    setLoading(true);

    try {
      // Set the session using the access_token from the link
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
      });
      if (sessionError) throw sessionError;

      // Update the password
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      alert("Password successfully updated! Please login.");
      navigate("/login"); // redirect to login page
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "400px", margin: "50px auto", textAlign: "center" }}>
      <h2>Set a New Password</h2>
      <form onSubmit={handleResetPassword}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="auth-input"
          required
        />
        <input
          type="password"
          placeholder="New Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="auth-input"
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? "Updating..." : "Update Password"}
        </button>
      </form>
    </div>
  );
};

export default ResetPassword;

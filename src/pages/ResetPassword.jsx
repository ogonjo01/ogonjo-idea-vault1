import React, { useState, useEffect } from "react";
import { supabase } from "../supabase/supabaseClient";
import { useNavigate } from "react-router-dom";
import "./ResetPassword.css";

const ResetPassword = () => {
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [accessToken, setAccessToken] = useState(null);
  const [email, setEmail] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
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
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
      });
      if (sessionError) throw sessionError;

      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      alert("Password successfully updated! Please login.");
      navigate("/login");
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reset-container">
      <h2>Set a New Password</h2>
      <form className="reset-form" onSubmit={handleResetPassword}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="New Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
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

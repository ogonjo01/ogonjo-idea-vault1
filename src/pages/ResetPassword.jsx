import React, { useState, useEffect } from "react";
import { supabase } from "../supabase/supabaseClient";
import { useNavigate } from "react-router-dom";
import "./ResetPassword.css";

const ResetPassword = () => {
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [token, setToken] = useState(null);
  const [email, setEmail] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const recoveryToken = params.get("token");
    const type = params.get("type");
    const userEmail = params.get("email");

    if (type !== "recovery" || !recoveryToken) {
      alert("Invalid or expired password reset link.");
      return;
    }

    setToken(recoveryToken);
    if (userEmail) setEmail(userEmail);
  }, []);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!password) return alert("Please enter a new password.");
    setLoading(true);

    try {
      // Set session temporarily using the recovery token
      const { error: sessionError } = await supabase.auth.setSession({
        refresh_token: token,
      });
      if (sessionError) throw sessionError;

      // Update the password
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
    <div className="reset-page">
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
    </div>
  );
};

export default ResetPassword;

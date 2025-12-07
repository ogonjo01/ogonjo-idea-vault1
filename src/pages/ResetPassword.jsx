import React, { useEffect, useState } from "react";
import { supabase } from "../supabase/supabaseClient";
import { useNavigate } from "react-router-dom";
import "./ResetPassword.css";

const ResetPassword = () => {
  const [loading, setLoading] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState("");
  const [hasUsableToken, setHasUsableToken] = useState(false); // token exists (but not used yet)
  const [tokenSource, setTokenSource] = useState(null); // { access_token, refresh_token } OR { recoveryToken }
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Parse query params and hash params but DO NOT set session automatically.
    const query = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));

    const qToken = query.get("token"); // verify step token param
    const qAccess = query.get("access_token");
    const qRefresh = query.get("refresh_token");
    const qType = query.get("type");
    const qEmail = query.get("email");

    const hAccess = hash.get("access_token");
    const hRefresh = hash.get("refresh_token");
    const hEmail = hash.get("email");
    const hType = hash.get("type");

    // prefer explicit email if present
    if (qEmail) setEmail(qEmail);
    if (hEmail) setEmail(hEmail);

    // If access/refresh present (common after Supabase verify redirect), store them but DO NOT call setSession yet
    const access_token = hAccess || qAccess;
    const refresh_token = hRefresh || qRefresh;
    if (access_token || refresh_token) {
      setTokenSource({
        access_token: access_token || undefined,
        refresh_token: refresh_token || undefined,
      });
      setHasUsableToken(true);
      return;
    }

    // If we only have the one-time verify token (token=<token>&type=recovery), store it for use on submit
    if (qType === "recovery" && qToken) {
      setTokenSource({ recoveryToken: qToken });
      setHasUsableToken(true);
      return;
    }
    if (hType === "recovery" && qToken) { // just in case
      setTokenSource({ recoveryToken: qToken });
      setHasUsableToken(true);
      return;
    }

    // no usable token
    setHasUsableToken(false);
  }, []);

  const validate = () => {
    setError(null);
    if (!newPassword || !confirmPassword) {
      setError("Please fill both password fields.");
      return false;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return false;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return false;
    }
    return true;
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    if (!validate()) return;

    if (!hasUsableToken || !tokenSource) {
      setError("No valid password reset token found. Request a new password reset email.");
      return;
    }

    setLoading(true);

    try {
      // 1) Set session using available tokens (only now, during submission)
      if (tokenSource.access_token || tokenSource.refresh_token) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: tokenSource.access_token,
          refresh_token: tokenSource.refresh_token,
        });
        if (sessionError) throw sessionError;
      } else if (tokenSource.recoveryToken) {
        // attempt to use the one-time token as refresh_token (works in many setups)
        const { error: sessionError } = await supabase.auth.setSession({
          refresh_token: tokenSource.recoveryToken,
        });
        if (sessionError) {
          // If that fails, throw to show a clear message
          throw new Error("Could not establish a temporary session from the recovery token. Ensure redirect URLs and Site URL are configured correctly in Supabase.");
        }
      } else {
        throw new Error("No usable token to set session.");
      }

      // 2) Update the user's password (this requires a session)
      const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword });
      if (updateErr) throw updateErr;

      // 3) Immediately sign out so the user is not left logged in
      await supabase.auth.signOut();

      setMessage("Password updated successfully — please log in with your new password.");
      // small delay so user sees message, then redirect to login
      setTimeout(() => navigate("/login"), 1200);
    } catch (err) {
      setError(err?.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reset-page">
      <div className="reset-container">
        <h2>Set a New Password</h2>

        {!hasUsableToken && (
          <div className="reset-error">
            <p>Invalid or missing password reset token.</p>
            <p style={{ fontSize: 13, color: "#6b7280" }}>
              Request a new reset link from the site (Forgot password). If the link still fails, check Supabase Site URL and Redirect URLs.
            </p>
          </div>
        )}

        {hasUsableToken && (
          <>
            <form className="reset-form" onSubmit={handleReset}>
              <input
                type="email"
                placeholder="Email (optional)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="reset-input"
              />

              <div className="password-row">
                <input
                  type="password"
                  placeholder="New password (min 8 chars)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="reset-input"
                  required
                />
              </div>

              <div className="password-row">
                <input
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="reset-input"
                  required
                />
              </div>

              {error && <div className="reset-error">{error}</div>}
              {message && <div className="reset-success">{message}</div>}

              <button className="reset-button" type="submit" disabled={loading}>
                {loading ? "Updating..." : "Update password"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;

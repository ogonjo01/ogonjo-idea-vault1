// src/pages/ResetPassword.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../supabase/supabaseClient";
import { useNavigate } from "react-router-dom";
import "./ResetPassword.css";

const DebugBox = ({ lines = [] }) => (
  <pre style={{ textAlign: "left", fontSize: 12, color: "#666", marginTop: 12 }}>
    {lines.map((l, i) => `${i + 1}. ${l}`).join("\n")}
  </pre>
);

const ResetPassword = () => {
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [tokenPresent, setTokenPresent] = useState(false);
  const [debugLines, setDebugLines] = useState([]);
  const navigate = useNavigate();

  const addDebug = (line) => setDebugLines((d) => [...d, line]);

  useEffect(() => {
    // Parse query params
    const query = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));

    addDebug("Raw window.location.search: " + window.location.search);
    addDebug("Raw window.location.hash: " + window.location.hash);

    // Supabase can send different params depending on flow:
    //  - Older verify link: token=<token>&type=recovery (query)
    //  - After verify, Supabase may redirect with access_token/refresh_token in query or hash
    const qToken = query.get("token");
    const qAccess = query.get("access_token");
    const qRefresh = query.get("refresh_token");
    const qType = query.get("type");
    const qEmail = query.get("email");

    const hAccess = hash.get("access_token");
    const hRefresh = hash.get("refresh_token");
    const hType = hash.get("type");
    const hEmail = hash.get("email");

    addDebug(`query token=${qToken} access_token=${qAccess} refresh_token=${qRefresh} type=${qType} email=${qEmail}`);
    addDebug(`hash access_token=${hAccess} refresh_token=${hRefresh} type=${hType} email=${hEmail}`);

    // Prefer explicit email if present
    if (qEmail) setEmail(qEmail);
    if (hEmail) setEmail(hEmail);

    // Determine token source
    // Case A: direct access_token or refresh_token in hash or query (common after redirect)
    const access_token = hAccess || qAccess;
    const refresh_token = hRefresh || qRefresh;

    if (access_token || refresh_token) {
      addDebug("Found access_token/refresh_token in URL.");
      setTokenPresent(true);
      // set session immediately so user can update password
      (async () => {
        try {
          addDebug("Calling supabase.auth.setSession with tokens...");
          const { data, error } = await supabase.auth.setSession({
            access_token: access_token || undefined,
            refresh_token: refresh_token || undefined,
          });
          if (error) {
            addDebug("setSession error: " + error.message);
          } else {
            addDebug("setSession success.");
          }
        } catch (err) {
          addDebug("setSession threw: " + (err?.message || err));
        }
      })();
      return;
    }

    // Case B: verify link gives token=<token>&type=recovery (query). For this flow,
    // the token in query is a one-time verify token — Supabase's verify endpoint
    // should exchange it and then redirect with real tokens. If you still have
    // only token in query, it means the project didn't perform the redirect->append step.
    if (qType === "recovery" && qToken) {
      addDebug("Found token in query (verify step).");
      // Attempt to set session using this token as refresh_token (works for many setups)
      (async () => {
        try {
          addDebug("Attempting to setSession using token as refresh_token...");
          const { data, error } = await supabase.auth.setSession({
            refresh_token: qToken,
          });
          if (error) {
            addDebug("setSession with token failed: " + error.message);
          } else {
            addDebug("setSession with token succeeded.");
            setTokenPresent(true);
          }
        } catch (err) {
          addDebug("setSession threw: " + (err?.message || err));
        }
      })();
      return;
    }

    // Nothing found — no usable token
    addDebug("No usable tokens found in URL. This means Supabase did not attach an access/refresh token on redirect.");
    setTokenPresent(false);
  }, []);

  const handleReset = async (e) => {
    e.preventDefault();
    if (!password) return alert("Please provide a new password.");
    setLoading(true);
    try {
      // Update password for the currently authenticated session
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      alert("Password updated — please log in with your new password.");
      navigate("/login");
    } catch (err) {
      alert(err.message || "Failed to update password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reset-page">
      <div className="reset-container">
        <h2>Set a New Password</h2>

        {!tokenPresent && (
          <>
            <p style={{ color: "#ef4444", marginBottom: 8 }}>
              Invalid or missing token — we couldn't find a valid reset token in the URL.
            </p>

            <div style={{ textAlign: "left", fontSize: 14, color: "#374151" }}>
              <p>
                Quick checklist to fix this:
              </p>
              <ol style={{ paddingLeft: 18 }}>
                <li>
                  In Supabase dashboard → Authentication:
                  <ul>
                    <li><strong>Site URL</strong> must be exactly <code>https://ogonjo.com</code></li>
                    <li><strong>Redirect URLs (Allowlist)</strong> must include exactly <code>https://ogonjo.com/reset-password</code></li>
                  </ul>
                </li>
                <li>When sending the reset email, set <code>redirectTo: "https://ogonjo.com/reset-password"</code> in <code>resetPasswordForEmail</code>.</li>
                <li>Always test using a fresh reset email (tokens are one-time-use and expire quickly).</li>
                <li>Click the link and inspect the final URL — it should contain <code>access_token</code> or <code>refresh_token</code> (often in the URL hash, after <code>#</code>).</li>
              </ol>
            </div>

            <div style={{ marginTop: 12 }}>
              <button
                onClick={() => {
                  // helpful tip: tell them to request a new email
                  alert(
                    "Request a new password reset email from the site (use the regular 'Forgot password' flow). Then click the link and watch the URL. If it still doesn't include an access/refresh token, check the Supabase Redirect URLs and Site URL as described above."
                  );
                }}
                style={{
                  background: "linear-gradient(90deg,#4f46e5,#9333ea)",
                  color: "#fff",
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                How to fix (quick guide)
              </button>
            </div>
          </>
        )}

        {tokenPresent && (
          <>
            <form className="reset-form" onSubmit={handleReset}>
              <input
                type="email"
                placeholder="Email (optional)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ opacity: 0.9 }}
              />
              <input
                type="password"
                placeholder="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button type="submit" disabled={loading}>
                {loading ? "Updating..." : "Update password"}
              </button>
            </form>
            <p style={{ marginTop: 12, fontSize: 13, color: "#6b7280" }}>
              If update fails, open devtools → Network and check the request/response for the updateUser call.
            </p>
          </>
        )}

        <DebugBox lines={debugLines} />
      </div>
    </div>
  );
};

export default ResetPassword;

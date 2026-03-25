import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { api } from "../../api";

export function AcceptInvitePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const token = new URLSearchParams(location.search).get("token");

  const [form, setForm] = useState({ name: "", password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) setError("Invalid or missing secure invite token.");
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setError("");
    setLoading(true);

    try {
      await api.post("/v1/auth/accept-invite", {
        token,
        name: form.name,
        password: form.password
      });
      setSuccess(true);
      setTimeout(() => navigate("/login"), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to finalize account. The link may have expired.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f172a", padding: 20 }}>
      <div className="card" style={{ maxWidth: 420, width: "100%", padding: 32 }}>
        <h2 style={{ marginBottom: 8 }}>Secure Operator Invite</h2>
        <div className="muted" style={{ marginBottom: 24, fontSize: "0.9rem" }}>
          You have been formally invited to the SAMS Platform. Please define your legal name and set a secure passphrase.
        </div>

        {error && (
          <div style={{ padding: "12px 16px", background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", borderRadius: 8, marginBottom: 20, fontSize: "0.9rem" }}>
            {error}
          </div>
        )}

        {success ? (
          <div style={{ textAlign: "center", color: "#10b981", padding: "20px 0" }}>
            <h3 style={{ marginBottom: 8 }}>Account Deployed Successfully!</h3>
            <p>Your RBAC assignments have been synchronized natively. Routing to secure login...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: "0.9rem", fontWeight: 600 }}>
              Full Name
              <input required type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={{ padding: "10px 12px", borderRadius: 6, border: "1px solid #374151", background: "#111827", color: "#fff" }} />
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: "0.9rem", fontWeight: 600 }}>
              Secure Password
              <input required type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} style={{ padding: "10px 12px", borderRadius: 6, border: "1px solid #374151", background: "#111827", color: "#fff" }} />
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: "0.9rem", fontWeight: 600 }}>
              Confirm Password
              <input required type="password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} style={{ padding: "10px 12px", borderRadius: 6, border: "1px solid #374151", background: "#111827", color: "#fff" }} />
            </label>

            <button type="submit" disabled={loading || !token} style={{ padding: "12px", background: "#2563eb", borderRadius: 6, fontWeight: 700, marginTop: 8 }}>
              {loading ? "Authenticating..." : "Accept Secure Invite"}
            </button>
          </form>
        )}

        <div style={{ textAlign: "center", marginTop: 24, fontSize: "0.85rem" }}>
          <Link to="/login" style={{ color: "#60a5fa", textDecoration: "none" }}>Return to Login</Link>
        </div>
      </div>
    </div>
  );
}

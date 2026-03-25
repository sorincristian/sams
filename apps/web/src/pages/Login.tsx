import React from "react";
import { useNavigate } from "react-router-dom";
import { api, setAuthToken } from "../api";

export function Login({ onLogin }: { onLogin: (token: string) => void }) {
  const navigate = useNavigate();
  const [email, setEmail] = React.useState("admin@sams.local");
  const [password, setPassword] = React.useState("password123");
  const [error, setError] = React.useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const res = await api.post("/auth/login", { email, password });
      setAuthToken(res.data.token);
      onLogin(res.data.token);
      if (window.location.pathname !== "/" && window.location.pathname !== "/login") {
        navigate(window.location.pathname + window.location.search, { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        setError("Invalid credentials");
      } else {
        setError("Server connection error");
      }
    }
  }

  return (
    <div className="login">
      {/* Transit seat pictogram */}
      <svg
        width="52" height="52" viewBox="0 0 52 52"
        fill="none" xmlns="http://www.w3.org/2000/svg"
        style={{ marginBottom: 8 }}
        aria-label="Transit seat icon"
      >
        {/* Seat back */}
        <rect x="10" y="8" width="32" height="22" rx="4" fill="#1e3a5f" stroke="#60a5fa" strokeWidth="2"/>
        {/* Seat cushion */}
        <rect x="8" y="28" width="36" height="10" rx="3" fill="#2563eb" stroke="#60a5fa" strokeWidth="2"/>
        {/* Left leg */}
        <rect x="12" y="37" width="5" height="10" rx="2" fill="#374151" stroke="#60a5fa" strokeWidth="1.5"/>
        {/* Right leg */}
        <rect x="35" y="37" width="5" height="10" rx="2" fill="#374151" stroke="#60a5fa" strokeWidth="1.5"/>
        {/* Armrest left */}
        <rect x="6" y="24" width="4" height="14" rx="2" fill="#1e3a5f" stroke="#60a5fa" strokeWidth="1.5"/>
        {/* Armrest right */}
        <rect x="42" y="24" width="4" height="14" rx="2" fill="#1e3a5f" stroke="#60a5fa" strokeWidth="1.5"/>
        {/* Seat insert highlight line */}
        <rect x="14" y="31" width="24" height="3" rx="1.5" fill="#93c5fd" opacity="0.6"/>
      </svg>

      <h1>SAMS</h1>
      <p className="muted">
        <span style={{ fontWeight: 700, color: "#60a5fa" }}>SIMS</span>
        {" — "}Seat Inserts Management System
      </p>

      <form className="row" onSubmit={submit}>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" />
        <button type="submit">Sign in</button>
        {error ? <div className="muted">{error}</div> : null}
      </form>
    </div>
  );
}

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
      navigate("/");
    } catch {
      setError("Invalid credentials");
    }
  }

  return (
    <div className="login">
      <h1>SAMS</h1>
      <p className="muted">Seat Inserts Management System</p>
      <form className="row" onSubmit={submit}>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" />
        <button type="submit">Sign in</button>
        {error ? <div className="muted">{error}</div> : null}
      </form>
    </div>
  );
}

import React from "react";
import { Route, Routes } from "react-router-dom";
import { api, setAuthToken } from "./api";
import { Login } from "./pages/Login";
import { Shell } from "./layouts/Shell";

function useAuth() {
  const [token, setToken] = React.useState<string | null>(localStorage.getItem("sams_token"));
  const [user, setUser] = React.useState<{ name: string; email: string; role: string } | null>(null);

  React.useEffect(() => {
    if (!token) return;
    api.get("/auth/me").then((res) => setUser(res.data)).catch(() => {
      setAuthToken(null);
      setToken(null);
    });
  }, [token]);

  return { token, setToken, user, setUser };
}

export function App() {
  const auth = useAuth();

  function logout() {
    setAuthToken(null);
    auth.setToken(null);
    auth.setUser(null);
  }

  return auth.token ? <Shell user={auth.user} onLogout={logout} /> : <Routes><Route path="*" element={<Login onLogin={auth.setToken} />} /></Routes>;
}

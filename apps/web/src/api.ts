import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "https://sams-platform-2-backend.onrender.com/api"
});

export function setAuthToken(token: string | null) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
    localStorage.setItem("sams_token", token);
  } else {
    delete api.defaults.headers.common.Authorization;
    localStorage.removeItem("sams_token");
  }
}

const saved = localStorage.getItem("sams_token");
if (saved) setAuthToken(saved);

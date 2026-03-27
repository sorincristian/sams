import { api, setAuthToken } from "../api";

// Core auth service wrapping all JWT lifecycle API calls
export const authService = {
  login: async (email: string, password: string) => {
    const res = await api.post("/auth/login", { email, password });
    return res.data; // { token, user }
  },

  logout: () => {
    setAuthToken(null);
    localStorage.removeItem("sams_token");
    sessionStorage.removeItem("auth_redirect_to");
  },

  getCurrentUser: async () => {
    const res = await api.get("/auth/me");
    return res.data;
  },

  forgotPassword: async (email: string) => {
    const res = await api.post("/auth/forgot-password", { email });
    return res.data;
  },

  resetPassword: async (token: string, password: string) => {
    const res = await api.post("/auth/reset-password", { token, password });
    return res.data;
  }
};

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

  // Backend Placeholder - Endpoint does not natively exist in express router yet.
  forgotPassword: async (email: string) => {
    console.warn("Backend dependency: /api/auth/forgot-password is not fully implemented");
    return api.post("/auth/forgot-password", { email }).catch((err: any) => {
      // Mock success for UI flow testing until endpoint exists
      console.log("Mocking forgot password success for:", email);
      return { data: { success: true } };
    });
  },

  // Backend Placeholder - Endpoint does not natively exist in express router yet.
  resetPassword: async (token: string, password: string) => {
    console.warn("Backend dependency: /api/auth/reset-password is not fully implemented");
    return api.post("/auth/reset-password", { token, password }).catch((err: any) => {
      // Mock success for UI flow testing until endpoint exists
      console.log("Mocking reset password success for:", token);
      return { data: { success: true } };
    });
  }
};

import React from "react";
import { authService } from "../services/authService";
import { setAuthToken } from "../api";

interface AuthStatus {
  status: "idle" | "loading" | "authenticated" | "unauthenticated" | "expired";
  user: any | null;
  token: string | null;
}

interface AuthContextType extends AuthStatus {
  login: (token: string, user: any) => void;
  logout: (expired?: boolean) => void;
  checkSession: () => Promise<void>;
}

export const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<AuthStatus>({
    status: "idle",
    user: null,
    token: null,
  });

  const checkSession = React.useCallback(async () => {
    const storedToken = localStorage.getItem("sams_token");
    if (!storedToken) {
      setState({ status: "unauthenticated", user: null, token: null });
      return;
    }

    // Set header for `/auth/me` request natively
    setAuthToken(storedToken);

    try {
      const user = await authService.getCurrentUser();
      setState({
        status: "authenticated",
        user,
        token: storedToken
      });
    } catch (err: any) {
      // Token is strictly invalid or expired
      setState({ status: err.response?.status === 401 ? "expired" : "unauthenticated", user: null, token: null });
      authService.logout();
    }
  }, []);

  React.useEffect(() => {
    checkSession();
  }, [checkSession]);

  const login = React.useCallback((token: string, user: any) => {
    localStorage.setItem("sams_token", token);
    setAuthToken(token);
    setState({
      status: "authenticated",
      user,
      token
    });
  }, []);

  const logout = React.useCallback((expired = false) => {
    authService.logout();
    setState({
      status: expired ? "expired" : "unauthenticated",
      user: null,
      token: null
    });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, checkSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
}

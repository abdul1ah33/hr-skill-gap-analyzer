import React, { createContext, useContext, useState, useEffect } from "react";

export interface JwtPayload {
  sub?: string;
  role?: "HR" | "Employee";
  exp?: number;
  email?: string;
  username?: string;
  [key: string]: any;
}

interface AuthContextType {
  token: string | null;
  user: JwtPayload | null;
  role: "HR" | "Employee" | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (accessToken: string) => void;
  logout: () => void;
}

export function decodeJwt(token: string): JwtPayload | null {
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error("Failed to decode JWT:", error);
    return null;
  }
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<JwtPayload | null>(null);
  const [role, setRole] = useState<"HR" | "Employee" | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Restore session on load
    const storedToken = localStorage.getItem("token") || localStorage.getItem("access_token");
    if (storedToken) {
      const decoded = decodeJwt(storedToken);
      if (decoded && decoded.exp && decoded.exp * 1000 > Date.now()) {
        setToken(storedToken);
        setUser(decoded);
        setRole(decoded.role || null);
      } else {
        // Expired or invalid token
        localStorage.removeItem("token");
        localStorage.removeItem("access_token");
      }
    }
    setIsLoading(false);
  }, []);

  const login = (accessToken: string) => {
    localStorage.setItem("token", accessToken);
    localStorage.setItem("access_token", accessToken);
    const decoded = decodeJwt(accessToken);
    setToken(accessToken);
    setUser(decoded);
    setRole(decoded?.role || null);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("access_token");
    setToken(null);
    setUser(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        role,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

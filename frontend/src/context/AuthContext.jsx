import React, { createContext, useContext, useState, useEffect } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("waypoint_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  // Check current session on mount
  useEffect(() => {
    const token = localStorage.getItem("waypoint_token");
    if (!token) {
      setLoading(false);
      return;
    }

    api
      .get("/users/me")
      .then((res) => {
        const userData = res.data.data;
        setUser(userData);
        localStorage.setItem("waypoint_user", JSON.stringify(userData));
      })
      .catch(() => {
        localStorage.removeItem("waypoint_token");
        localStorage.removeItem("waypoint_user");
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const login = async (email, password) => {
    const res = await api.post("/users/login", { email, password });
    const { user: userData, accessToken } = res.data.data;
    localStorage.setItem("waypoint_token", accessToken);
    localStorage.setItem("waypoint_user", JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const register = async (fullName, email, username, password, role) => {
    const res = await api.post("/users/register", {
      fullName,
      email,
      username,
      password,
      role: role || "DEVELOPER",
    });
    return res.data;
  };

  const verifyOtp = async (email, otp) => {
    const res = await api.post("/users/verify-otp", { email, otp });
    return res.data;
  };

  const resendOtp = async (email) => {
    const res = await api.post("/users/resend-otp", { email });
    return res.data;
  };

  const logout = async () => {
    try {
      await api.post("/users/logout");
    } catch (e) {
      // ignore network errors on logout
    }
    localStorage.removeItem("waypoint_token");
    localStorage.removeItem("waypoint_user");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        verifyOtp,
        resendOtp,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

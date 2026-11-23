import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// Request interceptor to attach JWT token from localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("waypoint_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle errors gracefully
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || error.message || "An unexpected error occurred";
    // If token expired, clear and trigger redirect if not on auth page
    if (error.response?.status === 401 && !window.location.pathname.startsWith("/auth")) {
      localStorage.removeItem("waypoint_token");
      localStorage.removeItem("waypoint_user");
      window.location.href = "/auth";
    }
    return Promise.reject(new Error(message));
  }
);

export default api;

import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8000",
});

// Request interceptor to attach JWT token to headers
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token") || localStorage.getItem("access_token");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle 401 Unauthorized globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("access_token");
      // If unauthenticated and not already on auth pages, redirect to login
      if (!window.location.pathname.startsWith("/login") && !window.location.pathname.startsWith("/signup")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;

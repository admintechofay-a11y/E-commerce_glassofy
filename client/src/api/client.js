import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor to handle token expiry / error formatting
api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    // 1. Network Failure / Offline handling
    if (!error.response) {
      return Promise.reject({
        success: false,
        message: 'Unable to reach the Glassofy server. Please check your network connection and try again.',
      });
    }

    const originalRequest = error.config;

    // 2. Token expiry handling (401 Unauthorized)
    if (
      error.response?.status === 401 &&
      !originalRequest?._retry &&
      !originalRequest?.url?.includes('/auth/login') &&
      !originalRequest?.url?.includes('/auth/register') &&
      !originalRequest?.url?.includes('/auth/refresh') &&
      !originalRequest?.url?.includes('/auth/me')
    ) {
      originalRequest._retry = true;
      try {
        await axios.post(
          `${import.meta.env.VITE_API_URL || '/api'}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        return api(originalRequest);
      } catch (_refreshError) {
        // Only redirect to login if currently on protected pages
        if (
          typeof window !== 'undefined' &&
          (window.location.pathname.startsWith('/admin') ||
            window.location.pathname.startsWith('/profile') ||
            window.location.pathname.startsWith('/my-orders') ||
            window.location.pathname.startsWith('/checkout'))
        ) {
          window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
        }
        return Promise.reject({
          success: false,
          message: 'Your session has expired. Please sign in again.',
        });
      }
    }

    // 3. Normalized error formatting: ensure human-readable message, never raw stack traces
    const resData = error.response?.data;
    const formattedError = {
      status: error.response?.status,
      success: false,
      message:
        resData?.message ||
        resData?.error ||
        (error.response?.status === 403
          ? 'You do not have permission to perform this action.'
          : error.response?.status === 404
            ? 'The requested resource was not found.'
            : error.response?.status === 500
              ? 'Our server encountered an internal error. Please try again shortly.'
              : 'An unexpected error occurred. Please try again.'),
      errors: resData?.errors || null,
    };

    return Promise.reject(formattedError);
  }
);

export default api;

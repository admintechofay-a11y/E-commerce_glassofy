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

    // 3. Normalized error formatting: ensure human-readable string message, never raw objects or stack traces
    const resData = error.response?.data;
    let safeMessage = '';

    if (typeof resData === 'string') {
      safeMessage = resData;
    } else if (typeof resData?.message === 'string') {
      safeMessage = resData.message;
    } else if (typeof resData?.error === 'string') {
      safeMessage = resData.error;
    } else if (typeof resData?.message?.message === 'string') {
      safeMessage = resData.message.message;
    } else if (typeof resData?.error?.message === 'string') {
      safeMessage = resData.error.message;
    } else if (Array.isArray(resData?.errors) && resData.errors.length > 0) {
      const first = resData.errors[0];
      safeMessage = typeof first === 'string' ? first : first?.message || 'Validation failed';
    }

    if (!safeMessage) {
      const status = error.response?.status;
      if (status === 400) safeMessage = 'Invalid request. Please check the details entered.';
      else if (status === 401) safeMessage = 'Invalid email or password.';
      else if (status === 403) safeMessage = 'You do not have permission to perform this action.';
      else if (status === 404) safeMessage = 'The requested resource was not found.';
      else if (status === 409) safeMessage = 'An account with this email address already exists.';
      else if (status === 422) safeMessage = 'Please verify the submitted details and try again.';
      else if (status === 429) safeMessage = 'Too many attempts. Please try again shortly.';
      else if (status >= 500) safeMessage = 'Our server encountered an internal error. Please try again shortly.';
      else safeMessage = 'An unexpected error occurred. Please try again.';
    }

    const formattedError = {
      status: error.response?.status,
      success: false,
      message: String(safeMessage),
      errors: Array.isArray(resData?.errors) ? resData.errors : null,
    };

    return Promise.reject(formattedError);
  }
);

export default api;

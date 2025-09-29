import axios, { AxiosInstance, AxiosError } from 'axios';
import toast from 'react-hot-toast';

// Create axios instance
export const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add tenant header for multi-tenant support
    const hostname = window.location.hostname;
    if (hostname && hostname !== 'localhost' && !hostname.includes('127.0.0.1')) {
      const parts = hostname.split('.');
      if (parts.length >= 3 && !['www', 'api', 'app', 'admin'].includes(parts[0])) {
        config.headers['X-Tenant'] = parts[0];
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError<any>) => {
    if (error.response) {
      const { status, data } = error.response;

      switch (status) {
        case 401:
          // Unauthorized - clear auth and redirect to login
          localStorage.removeItem('authToken');
          if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
            window.location.href = '/login';
          }
          toast.error(data?.error || 'Session expired. Please login again.');
          break;

        case 403:
          toast.error(data?.error || 'Access denied.');
          break;

        case 404:
          toast.error(data?.error || 'Resource not found.');
          break;

        case 409:
          toast.error(data?.error || 'Conflict occurred.');
          break;

        case 422:
          // Validation errors
          if (data?.errors && Array.isArray(data.errors)) {
            data.errors.forEach((error: any) => {
              toast.error(error.message || 'Validation error');
            });
          } else {
            toast.error(data?.error || 'Validation failed.');
          }
          break;

        case 429:
          toast.error('Too many requests. Please try again later.');
          break;

        case 500:
        case 502:
        case 503:
        case 504:
          toast.error('Server error. Please try again later.');
          break;

        default:
          toast.error(data?.error || 'An unexpected error occurred.');
      }
    } else if (error.request) {
      // Network error
      toast.error('Network error. Please check your connection.');
    } else {
      // Request setup error
      toast.error('Request error. Please try again.');
    }

    return Promise.reject(error);
  }
);

// Helper functions for common API patterns
export const apiHelpers = {
  // Get with loading state
  async getWithLoading<T>(url: string, showToast = false): Promise<T> {
    if (showToast) {
      toast.loading('Loading...');
    }
    try {
      const response = await api.get<T>(url);
      if (showToast) {
        toast.dismiss();
      }
      return response.data;
    } catch (error) {
      if (showToast) {
        toast.dismiss();
      }
      throw error;
    }
  },

  // Post with success toast
  async postWithSuccess<T>(url: string, data: any, successMessage?: string): Promise<T> {
    const response = await api.post<T>(url, data);
    if (successMessage) {
      toast.success(successMessage);
    }
    return response.data;
  },

  // Put with success toast
  async putWithSuccess<T>(url: string, data: any, successMessage?: string): Promise<T> {
    const response = await api.put<T>(url, data);
    if (successMessage) {
      toast.success(successMessage);
    }
    return response.data;
  },

  // Delete with confirmation
  async deleteWithConfirmation<T>(url: string, confirmMessage?: string): Promise<T> {
    const confirmed = window.confirm(confirmMessage || 'Are you sure you want to delete this item?');
    if (!confirmed) {
      throw new Error('Delete cancelled');
    }
    const response = await api.delete<T>(url);
    toast.success('Deleted successfully');
    return response.data;
  },
};

export default api;
import { api } from './api';
import { ApiResponse, AuthResponse, User } from '@/types';

interface LoginData {
  email: string;
  password: string;
}

interface RegisterData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  organizationName?: string;
  organizationSlug?: string;
}

export const authService = {
  async login(email: string, password: string): Promise<ApiResponse<AuthResponse>> {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/login', {
      email,
      password,
    });
    return response.data;
  },

  async register(data: RegisterData): Promise<ApiResponse<AuthResponse>> {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/register', data);
    return response.data;
  },

  async getProfile(): Promise<ApiResponse<User>> {
    const response = await api.get<ApiResponse<User>>('/auth/profile');
    return response.data;
  },

  async logout(): Promise<ApiResponse> {
    const response = await api.post<ApiResponse>('/auth/logout');
    return response.data;
  },

  async refreshToken(): Promise<ApiResponse<{ token: string }>> {
    const response = await api.post<ApiResponse<{ token: string }>>('/auth/refresh');
    return response.data;
  },

  async forgotPassword(email: string): Promise<ApiResponse> {
    const response = await api.post<ApiResponse>('/auth/forgot-password', { email });
    return response.data;
  },

  async resetPassword(token: string, password: string): Promise<ApiResponse> {
    const response = await api.post<ApiResponse>('/auth/reset-password', {
      token,
      password,
    });
    return response.data;
  },

  async verifyEmail(token: string): Promise<ApiResponse> {
    const response = await api.post<ApiResponse>('/auth/verify-email', { token });
    return response.data;
  },

  async resendVerification(): Promise<ApiResponse> {
    const response = await api.post<ApiResponse>('/auth/resend-verification');
    return response.data;
  },
};
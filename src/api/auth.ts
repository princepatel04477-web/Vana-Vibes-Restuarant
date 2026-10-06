import { apiClient } from './client';
import { User } from '@/types/auth';

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export const authApi = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    return apiClient<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  getMe: async (): Promise<User> => {
    return apiClient<User>('/auth/me');
  },

  logout: async (): Promise<{ message: string }> => {
    return apiClient<{ message: string }>('/auth/logout', { method: 'POST' });
  },

  getUsers: async (): Promise<User[]> => {
    return apiClient<User[]>('/auth/users');
  },

  createUser: async (userData: {
    name: string;
    email: string;
    password: string;
    role: 'ADMIN' | 'CHEF';
    shift?: string;
    assigned_station?: string;
  }): Promise<User> => {
    return apiClient<User>('/auth/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  updateUser: async (
    userId: string,
    userData: {
      name?: string;
      role?: 'ADMIN' | 'CHEF';
      shift?: string;
      assigned_station?: string;
      password?: string;
      is_active?: boolean;
    }
  ): Promise<User> => {
    return apiClient<User>(`/auth/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(userData),
    });
  },

  deleteUser: async (userId: string): Promise<{ message: string }> => {
    return apiClient<{ message: string }>(`/auth/users/${userId}`, {
      method: 'DELETE',
    });
  },
};


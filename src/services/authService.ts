import api from './api';
import { User } from '../types';

interface LoginResponse {
  success: boolean;
  data?: {
    user: User;
    token: string;
  };
  requires2FA?: boolean;
  tempToken?: string;
  message?: string;
  error?: string;
}

interface RegisterResponse {
  success: boolean;
  message?: string;
  data?: {
    user: User;
    token: string;
  };
  error?: string;
}

interface ProfileResponse {
  success: boolean;
  data?: {
    user: User;
  };
  message?: string;
  error?: string;
}

interface UploadProfilePhotoResponse {
  success: boolean;
  message?: string;
  data?: {
    user: User;
    avatar: {
      url: string;
      delete_url: string;
      medium: string;
      thumb: string;
    };
  };
  error?: string;
}

const authService = {  
  uploadProfilePhoto: async (image: string): Promise<UploadProfilePhotoResponse> => {
    try {
      const response = await api.post<UploadProfilePhotoResponse>('/profile/uploadprofile', { image });
      return response.data;
    } catch (error: any) {
      if (error.response) {
        return error.response.data as UploadProfilePhotoResponse;
      }
      return { success: false, message: 'Erro de conexão com o servidor' };
    }
  },
  login: async (email: string, password: string): Promise<LoginResponse> => {
    try {
      const response = await api.post<LoginResponse>('/auth/login', { email, password });
      return response.data;
    } catch (error: any) {
      if (error.response) {
        return error.response.data as LoginResponse;
      }
      return { success: false, message: 'Erro de conexão com o servidor' };
    }
  },

  register: async (name: string, email: string, password: string, phone?: string): Promise<RegisterResponse> => {
    try {
      const response = await api.post<RegisterResponse>('/auth/register', { name, email, password, phone });
      return response.data;
    } catch (error: any) {
      if (error.response) {
        return error.response.data as RegisterResponse;
      }
      return { success: false, message: 'Erro de conexão com o servidor' };
    }
  },

  getProfile: async (): Promise<ProfileResponse> => {
    try {
      const response = await api.get<ProfileResponse>('/auth/me');
      return response.data;
    } catch (error: any) {
      if (error.response) {
        return error.response.data as ProfileResponse;
      }
      return { success: false, message: 'Erro de conexão com o servidor' };
    }
  },

  updateProfile: async (userData: Partial<User>): Promise<ProfileResponse> => {
    try {
      const response = await api.put<ProfileResponse>('/auth/me', userData);
      return response.data;
    } catch (error: any) {
      if (error.response) {
        return error.response.data as ProfileResponse;
      }
      return { success: false, message: 'Erro de conexão com o servidor' };
    }
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await api.put<{ success: boolean; message: string }>('/auth/change-password', {
        currentPassword,
        newPassword
      });
      return response.data;
    } catch (error: any) {
      if (error.response) {
        return error.response.data;
      }
      return { success: false, message: 'Erro de conexão com o servidor' };
    }
  }
};

export default authService;
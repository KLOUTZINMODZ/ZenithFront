import api from './api';
import { Notification } from '../types';
import gameCacheService from './gameCacheService';

interface NotificationResponse {
  success: boolean;
  data?: {
    notifications: Notification[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      pages: number;
    };
    unreadCount: number;
  };
  message?: string;
  error?: string;
}

interface MarkAsReadResponse {
  success: boolean;
  message?: string;
  error?: string;
}

interface MarkAllAsReadResponse {
  success: boolean;
  message?: string;
  data?: {
    count: number;
  };
  error?: string;
}

const notificationService = {
  getNotifications: async (page = 1, limit = 20, unreadOnly = false): Promise<NotificationResponse> => {
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());

      if (unreadOnly) params.append('isRead', 'false');

      const response = await api.get<NotificationResponse>(`/notifications?${params.toString()}`);
      

      if (response.data && response.data.data) {

        if (!Array.isArray(response.data.data.notifications)) {
          response.data.data.notifications = [];
        }
        

        if (!response.data.data.pagination) {
          response.data.data.pagination = {
            total: 0,
            page: page,
            limit: limit,
            pages: 0
          };
        }
      } else if (response.data) {

        response.data.data = {
          notifications: [],
          pagination: {
            total: 0,
            page: page,
            limit: limit,
            pages: 0
          },
          unreadCount: 0
        };
      }
      
      return response.data;
    } catch (error: any) {
      if (error.response) {
        const errorResponse = error.response.data as NotificationResponse;

        if (!errorResponse.data) {
          errorResponse.data = {
            notifications: [],
            pagination: {
              total: 0,
              page: page,
              limit: limit,
              pages: 0
            },
            unreadCount: 0
          };
        } else if (!Array.isArray(errorResponse.data.notifications)) {
          errorResponse.data.notifications = [];
        }
        return errorResponse;
      }
      return { 
        success: false, 
        message: 'Erro de conexão com o servidor',
        data: {
          notifications: [],
          pagination: {
            total: 0,
            page: page,
            limit: limit,
            pages: 0
          },
          unreadCount: 0
        }
      };
    }
  },

  markAsRead: async (id: string): Promise<MarkAsReadResponse> => {
    try {
      const response = await api.put<MarkAsReadResponse>(`/notifications/${id}/read`);
      return response.data;
    } catch (error: any) {
      if (error.response) {
        return error.response.data as MarkAsReadResponse;
      }
      return { success: false, message: 'Erro de conexão com o servidor' };
    }
  },

  markAllAsRead: async (): Promise<MarkAllAsReadResponse> => {
    try {
      const response = await api.put<MarkAllAsReadResponse>('/notifications/read-all');
      return response.data;
    } catch (error: any) {
      if (error.response) {
        return error.response.data as MarkAllAsReadResponse;
      }
      return { success: false, message: 'Erro de conexão com o servidor' };
    }
  },


  getPreferences: async (): Promise<{
    success: boolean;
    data?: {
      preferences: {
        newProposal: boolean;
        proposalAccepted: boolean;
        newBoosting: boolean;
        boostingCompleted: boolean;
      };
      watchedGames?: string[];
      watchedGameIds?: string[];
      emailNotifications: boolean;
    };
    message?: string;
  }> => {
    try {
      const response = await api.get('/notifications/preferences');
      return response.data;
    } catch (error: any) {
      if (error.response) {
        return error.response.data;
      }
      return { success: false, message: 'Erro de conexão com o servidor' };
    }
  },


  updatePreferences: async (preferences: {
    preferences: {
      newProposal: boolean;
      proposalAccepted: boolean;
      newBoosting: boolean;
      boostingCompleted: boolean;
    };
    watchedGames?: string[];
    watchedGameIds?: number[];
    emailNotifications: boolean;
  }): Promise<{
    success: boolean;
    message?: string;
    data?: any;
  }> => {
    try {

      const normalizedPreferences = { ...preferences };
      
      if (preferences.watchedGames && !preferences.watchedGameIds) {
        const gameIds = await gameCacheService.namesToIds(preferences.watchedGames);
        normalizedPreferences.watchedGameIds = gameIds.map(id => parseInt(id.toString(), 10));
      }
      
      const response = await api.put('/notifications/preferences', normalizedPreferences);
      return response.data;
    } catch (error: any) {
      if (error.response) {
        return error.response.data;
      }
      return { success: false, message: 'Erro de conexão com o servidor' };
    }
  }
};

export default notificationService;
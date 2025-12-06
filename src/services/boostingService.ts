import api from './api';
import gameCacheService from './gameCacheService';

interface BoostingRequest {
  currentRank: string;
  desiredRank: string;
  minPrice: string;
  game?: string;
  gameId?: string;
  accountImage: string;
  description?: string;
  estimatedTime?: string;
  gameMode?: string;
  additionalInfo?: string;
  detached?: boolean;
}

interface BoostingResponse {
  success: boolean;
  message?: string;
  data?: {
    boosting: {
      _id: string;
      currentRank: string;
      desiredRank: string;
      minPrice: number;
      game?: string;
      gameId?: string;
      accountImage: string;
      description?: string;
      estimatedTime?: string;
      gameMode?: string;
      additionalInfo?: string;
      detached?: boolean;
      clientId: string;
      status: string;
      createdAt: string;
      updatedAt: string;
    };
  };
  error?: string;
}

const boostingService = {
  async createBoostingRequest(requestData: BoostingRequest): Promise<BoostingResponse> {
    try {

      const normalizedData = { ...requestData };
      
      if (requestData.game && !requestData.gameId) {
        const gameId = await gameCacheService.normalizeToId(requestData.game);
        if (gameId) {
          normalizedData.gameId = gameId;
        }
      }
      
      const response = await api.post('/createboosting', normalizedData);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Erro ao criar pedido de boosting',
        error: error.message
      };
    }
  },

  async getBoostingRequests(params?: { 
    page?: number; 
    limit?: number; 
    game?: string;
    status?: string;
  }): Promise<{
    success: boolean;
    data?: {
      requests: any[];
      pagination: {
        total: number;
        page: number;
        limit: number;
        pages: number;
      };
    };
    message?: string;
  }> {
    try {
      const response = await api.get('/boosting-requests', { params });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Erro ao buscar pedidos de boosting'
      };
    }
  },

  async getMyBoostingRequests(params?: { 
    page?: number; 
    limit?: number; 
    status?: string;
  }): Promise<{
    success: boolean;
    data?: {
      requests: any[];
      pagination: {
        total: number;
        page: number;
        limit: number;
        pages: number;
      };
    };
    message?: string;
  }> {
    try {
      const response = await api.get('/my-boosting-requests', { params });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Erro ao buscar meus pedidos de boosting'
      };
    }
  },


  async createProposal(boostingId: string, proposalData: {
    proposedPrice: number;
    estimatedTime: string;
    message?: string;
  }): Promise<{
    success: boolean;
    message?: string;
    data?: any;
  }> {
    try {
      const response = await api.post(`/boosting-requests/${boostingId}/proposals`, proposalData);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Erro ao criar proposta'
      };
    }
  },


  async getProposals(boostingId: string): Promise<{
    success: boolean;
    data?: {
      proposals: any[];
      boostingRequest: any;
    };
    message?: string;
  }> {
    try {
      const response = await api.get(`/boosting-requests/${boostingId}/proposals`);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Erro ao buscar propostas'
      };
    }
  },


  async acceptProposal(boostingId: string, proposalId: string): Promise<{
    success: boolean;
    message?: string;
    data?: any;
  }> {
    try {
      const response = await api.post(`/boosting-requests/${boostingId}/proposals/${proposalId}/accept`);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Erro ao aceitar proposta'
      };
    }
  },


  async getBoostingRequestById(boostingId: string): Promise<{
    success: boolean;
    data?: {
      boostingRequest: any;
    };
    message?: string;
  }> {
    try {
      const response = await api.get(`/boosting-requests/${boostingId}`);
      return response.data;
    } catch (error: any) {
      if (error.response) {
        return error.response.data;
      }
      return { success: false, message: 'Erro de conexão com o servidor' };
    }
  },


  async deleteBoostingRequest(boostingId: string): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    try {
      const response = await api.delete(`/boosting-requests/${boostingId}`);
      return response.data;
    } catch (error: any) {
      if (error.response) {
        return error.response.data;
      }
      return { success: false, message: 'Erro de conexão com o servidor' };
    }
  },

  
  async deleteBoostingTemporaryChats(boostingId: string): Promise<{
    success: boolean;
    message?: string;
    deletedCount?: number;
  }> {
    try {
      const response = await api.delete(`/boosting-requests/${boostingId}/temporary-chats`);
      return response.data;
    } catch (error: any) {
      if (error.response) {
        return error.response.data;
      }
      return { success: false, message: 'Erro ao deletar chats temporários' };
    }
  },

  async breakBoostingRequest(boostingId: string, payload?: { reason?: string }): Promise<{
    success: boolean;
    message?: string;
    data?: any;
  }> {
    try {
      const response = await api.post(`/boosting-requests/${boostingId}/break`, payload || {});
      return response.data;
    } catch (error: any) {
      if (error.response) {
        return error.response.data;
      }
      return { success: false, message: 'Erro ao cancelar solicitação de boosting' };
    }
  },

  async completeBoostingRequest(boostingId: string, payload?: { completionNotes?: string }): Promise<{
    success: boolean;
    message?: string;
    data?: any;
  }> {
    try {
      const response = await api.post(`/boosting-requests/${boostingId}/complete`, payload || {});
      return response.data;
    } catch (error: any) {
      if (error.response) {
        return error.response.data;
      }
      return { success: false, message: 'Erro ao concluir boosting' };
    }
  },


  async getBoostingCategories(gameId?: number): Promise<{
    success: boolean;
    data?: {
      gameId?: number;
      gameName?: string;
      categories: string[];
    };
    message?: string;
  }> {
    try {
      const url = gameId ? `/boosting-categories?gameId=${gameId}` : '/boosting-categories';
      const response = await api.get(url);
      return response.data;
    } catch (error: any) {
      if (error.response) {
        return error.response.data;
      }
      return { success: false, message: 'Erro de conexão com o servidor' };
    }
  }
};

export default boostingService;

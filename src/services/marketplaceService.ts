import api from './api';
import { MarketItem } from '../types';

interface Seller {
  _id: string;
  userid: number;
  name: string;
  rating: number;
  avatar?: string;
  profilePicture?: string;
}

interface MarketItemResponse {
  _id: string;
  title: string;
  game: string;
  gameId: string;
  price: number;
  image: string;
  images: string[];
  category: string;
  description: string;
  sellerId: Seller;
  rating: {
    average: number;
    count: number;
  };
  views: number;
  status?: string; 
  deliveryMethod: string;
  deliveryInstructions: string;
  createdAt: string;
  updatedAt: string;
  detached?: boolean;
  stock?: number;
  stockLeft?: number;
}

interface MarketplaceResponse {
  success: boolean;
  data?: {
    items: MarketItemResponse[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      pages: number;
    };
    filters: {
      games: { id: string; name: string; count: number }[];
      categories: { id: string; name: string; count: number }[];
      priceRange: { min: number; max: number };
    };
  };
  message?: string;
  error?: string;
}

interface MarketItemDetailResponse {
  success: boolean;
  data?: {
    item?: {
      _id: string;
      title: string;
      game: string;
      price: number;
      originalPrice?: number;
      discount?: number;
      image: string;
      images?: string[];
      category: string;
      description: string;
      seller: {
        _id: string;
        name: string;
        avatar?: string;
        joinDate: string;
        rating: number;
        totalSales: number;
      };
      rating: {
        average: number;
        count: number;
      };
      views: number;
      deliveryMethod: string;
      deliveryInstructions?: string;
      createdAt: string;
      updatedAt: string;
      detached?: boolean;
      status?: string;
      stock?: number;
      stockLeft?: number;
    };
    items?: MarketItemResponse[];
    relatedItems?: (MarketItemResponse & { detached?: boolean })[];
  };
  message?: string;
  error?: string;
}

interface CreateItemResponse {
  success: boolean;
  message?: string;
  data?: {
    item: MarketItemResponse;
  };
  error?: string;
}

const marketplaceService = {
  getItems: async (params: {
    page?: number;
    limit?: number;
    game?: string;
    category?: string;
    sort?: string;
    minPrice?: number;
    maxPrice?: number;
    search?: string;
  }): Promise<MarketplaceResponse> => {
    try {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });

      const response = await api.get<MarketplaceResponse>(`/marketplace?${queryParams.toString()}`);
      return response.data;
    } catch (error: any) {
      if (error.response) {
        return error.response.data as MarketplaceResponse;
      }
      return { success: false, message: 'Erro de conexão com o servidor' };
    }
  },

  getAllItems: async (): Promise<{ success: boolean; data?: { items: MarketItemResponse[]; total: number }; message?: string }> => {
    try {
      const response = await api.get<{ success: boolean; data: { items: MarketItemResponse[]; total: number }; message?: string }>('/itensmarketplace');
      return response.data;
    } catch (error: any) {
      if (error.response) {
        return error.response.data;
      }
      return { success: false, message: 'Erro de conexão com o servidor' };
    }
  },

  getItemById: async (id: string): Promise<MarketItemDetailResponse> => {
    try {
      const response = await api.get<MarketItemDetailResponse>(`/marketplace/item/${id}`);
      return response.data;
    } catch (error: any) {
      if (error.response) {
        return error.response.data as MarketItemDetailResponse;
      }
      return { success: false, message: 'Erro de conexão com o servidor' };
    }
  },


  getMyItems: async (params?: { page?: number; limit?: number; status?: 'active' | 'inactive' | 'sold' | 'all' }): Promise<MarketplaceResponse> => {
    try {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append('page', String(params.page));
      if (params?.limit) queryParams.append('limit', String(params.limit));
      if (params?.status) queryParams.append('status', params.status);
      queryParams.append('my', '1');
      const response = await api.get<MarketplaceResponse>(`/marketplace?${queryParams.toString()}`);
      return response.data;
    } catch (error: any) {
      if (error.response) return error.response.data as MarketplaceResponse;
      return { success: false, message: 'Erro de conexão com o servidor' };
    }
  },

  createItem: async (data: any): Promise<CreateItemResponse> => {
    try {
      const response = await api.post<CreateItemResponse>('/marketplace', data, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error: any) {
      if (error.response) {
        return error.response.data as CreateItemResponse;
      }
      return { success: false, message: 'Erro de conexão com o servidor' };
    }
  },

  updateItem: async (id: string, data: Partial<MarketItem>): Promise<CreateItemResponse> => {
    try {
      const response = await api.put<CreateItemResponse>(`/marketplace/item/${id}`, data, {
        headers: { 'Content-Type': 'application/json' }
      });
      return response.data;
    } catch (error: any) {
      if (error.response) {
        return error.response.data as CreateItemResponse;
      }
      return { success: false, message: 'Erro de conexão com o servidor' };
    }
  },

  deleteItem: async (id: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const response = await api.delete<{ success: boolean; message?: string }>(`/marketplace/item/${id}`);
      return response.data;
    } catch (error: any) {
      if (error.response) {
        return error.response.data;
      }
      return { success: false, message: 'Erro de conexão com o servidor' };
    }
  },


  createMarketplaceHighlight: async (itemIds: string[]) => {
    try {
      const response = await api.post('/marketplace-highlights-payment', {
        marketplaceItemIds: itemIds
      });
      return response;
    } catch (error: any) {
      throw error;
    }
  },


  getPaymentStatus: async (sessionId: string) => {
    try {
      const response = await api.get(`/marketplace-highlights-payment/status/${sessionId}`);
      return response;
    } catch (error: any) {
      throw error;
    }
  }
};

export { marketplaceService };
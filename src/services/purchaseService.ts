import chatApi from './chatApi';

export interface InitiatePurchaseResponse {
  success: boolean;
  message?: string;
  data?: {
    purchaseId: string;
    conversationId: string;
  };
  error?: string;
}

export interface PurchaseListResponse {
  success: boolean;
  data?: {
    orders: Array<{
      _id: string;
      orderNumber: string;
      status: string;
      price: number;
      feePercent?: number;
      feeAmount?: number;
      sellerReceives?: number;
      createdAt: string;
      type?: 'marketplace' | 'boosting';
      hasReview?: boolean;
      item: { _id: string; title: string; image: string };
      buyer: { _id: string; name: string };
      seller: { _id: string; name: string };
      boostingRequest?: {
        _id: string;
        game: string;
        category?: string;
        currentRank?: string;
        desiredRank?: string;
      };
      deliveryMethod?: string;
    }>;
    pagination: { total: number; page: number; limit: number; pages: number };
  };
  message?: string;
  error?: string;
}

export interface ShipPurchaseResponse {
  success: boolean;
  message?: string;
  data?: { autoReleaseAt?: string };
  error?: string;
}

export interface ConfirmPurchaseResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface CancelPurchaseResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface GetPurchaseResponse {
  success: boolean;
  data?: {
    purchaseId: string;
    buyerId: string;
    sellerId: string;
    itemId?: string;
    price: number;
    status: string;
    conversationId?: string;
    escrowReservedAt?: string;
    shippedAt?: string;
    deliveredAt?: string;
    autoReleaseAt?: string;
    deliveryMethod?: string;
  };
  message?: string;
  error?: string;
}

export interface BuyerInfo {
  fullName: string;
  cpf: string;
  birthDate: string; 
  email: string;
}

const purchaseService = {
  initiate: async (params: {
    itemId: string;
    price?: number; 
    sellerUserId?: string; 
    itemTitle?: string;
    itemImage?: string;
    buyerInfo: BuyerInfo;
  }): Promise<InitiatePurchaseResponse> => {
    try {
      const res = await chatApi.post('/api/purchases/initiate', params);
      return res.data as InitiatePurchaseResponse;
    } catch (error: any) {
      if (error?.response?.data) return error.response.data as InitiatePurchaseResponse;
      return { success: false, message: 'Erro de conexão com o servidor' };
    }
  },

  ship: async (purchaseId: string): Promise<ShipPurchaseResponse> => {
    try {
      const res = await chatApi.post(`/api/purchases/${purchaseId}/ship`);
      return res.data as ShipPurchaseResponse;
    } catch (error: any) {
      if (error?.response?.data) return error.response.data as ShipPurchaseResponse;
      return { success: false, message: 'Erro de conexão com o servidor' } as any;
    }
  },

  confirm: async (purchaseId: string): Promise<ConfirmPurchaseResponse> => {
    try {
      const res = await chatApi.post(`/api/purchases/${purchaseId}/confirm`);
      return res.data as ConfirmPurchaseResponse;
    } catch (error: any) {
      if (error?.response?.data) return error.response.data as ConfirmPurchaseResponse;
      return { success: false, message: 'Erro de conexão com o servidor' } as any;
    }
  },

  
  notReceived: async (purchaseId: string, comment?: string): Promise<ConfirmPurchaseResponse> => {
    try {
      const payload = comment ? { comment } : {};
      const res = await chatApi.post(`/api/purchases/${purchaseId}/not-received`, payload);
      return res.data as ConfirmPurchaseResponse;
    } catch (error: any) {
      if (error?.response?.data) return error.response.data as ConfirmPurchaseResponse;
      return { success: false, message: 'Erro de conexão com o servidor' } as any;
    }
  },

  cancel: async (purchaseId: string): Promise<CancelPurchaseResponse> => {
    try {
      const res = await chatApi.post(`/api/purchases/${purchaseId}/cancel`);
      return res.data as CancelPurchaseResponse;
    } catch (error: any) {
      if (error?.response?.data) return error.response.data as CancelPurchaseResponse;
      return { success: false, message: 'Erro de conexão com o servidor' } as any;
    }
  },

  getById: async (purchaseId: string): Promise<GetPurchaseResponse> => {
    try {
      const res = await chatApi.get(`/api/purchases/${purchaseId}`);
      return res.data as GetPurchaseResponse;
    } catch (error: any) {
      if (error?.response?.data) return error.response.data as GetPurchaseResponse;
      return { success: false, message: 'Erro de conexão com o servidor' } as any;
    }
  },

  list: async (params: {
    type: 'sales' | 'purchases';
    page?: number;
    limit?: number;
    status?: string; 
  }): Promise<PurchaseListResponse> => {
    try {
      const res = await chatApi.get('/api/purchases/list', { params });
      return res.data as PurchaseListResponse;
    } catch (error: any) {
      if (error?.response?.data) return error.response.data as PurchaseListResponse;
      return {
        success: false,
        message: 'Erro de conexão com o servidor',
        data: {
          orders: [],
          pagination: { total: 0, page: params.page || 1, limit: params.limit || 10, pages: 0 }
        }
      } as PurchaseListResponse;
    }
  },

  // Buscar boosting/agreement por ID (compatível com agreements)
  getBoostingById: async (agreementId: string): Promise<GetPurchaseResponse> => {
    try {
      const res = await chatApi.get(`/api/agreements/${agreementId}`);
      
      if (res.data.success && res.data.data) {
        // Adaptar resposta de agreement para formato de purchase
        const agreement = res.data.data;
        return {
          success: true,
          data: {
            purchaseId: agreement._id || agreement.agreementId,
            buyerId: agreement.parties?.client?.userid,
            sellerId: agreement.parties?.booster?.userid,
            itemId: agreement.boostingRequestId,
            price: agreement.proposalSnapshot?.price || agreement.price || 0,
            status: agreement.status,
            conversationId: agreement.conversationId,
            escrowReservedAt: agreement.activatedAt || agreement.createdAt,
            shippedAt: agreement.activatedAt,
            deliveredAt: agreement.completedAt,
            autoReleaseAt: undefined
          }
        };
      }
      
      return res.data as GetPurchaseResponse;
    } catch (error: any) {
      if (error?.response?.data) return error.response.data as GetPurchaseResponse;
      return { success: false, message: 'Erro ao carregar boosting' } as any;
    }
  }
};

export default purchaseService;

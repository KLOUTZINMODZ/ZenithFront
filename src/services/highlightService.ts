import api from './api';

export interface HighlightPurchase {
  boostingIds?: string[];
  marketplaceItemIds?: string[];
  durationDays?: number;
}

export interface HighlightDetails {
  id: string;
  boostingId: string;
  status: 'active' | 'expired' | 'cancelled' | 'pending_payment';
  paymentStatus: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'refunded';
  amount: number;
  startDate: string;
  endDate: string;
  durationDays: number;
  isActive: boolean;
  isExpired: boolean;
  metrics?: {
    additionalViews: number;
    proposalsDuringHighlight: number;
    estimatedROI: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface HighlightStats {
  totalHighlights: number;
  activeHighlights: number;
  expiredHighlights: number;
  totalRevenue: number;
  averagePrice: number;
}

class HighlightService {
  


  async createHighlightPurchase(data: HighlightPurchase) {
    try {

      const endpoint = data.marketplaceItemIds ? '/marketplace-highlights' : '/highlights/purchase';
      
      const response = await api.post(endpoint, data);
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Erro ao processar compra de destaque',
        errors: error.response?.data?.errors || []
      };
    }
  }

  


  async createMarketplaceHighlightPurchase(data: { marketplaceItemIds: string[]; durationDays?: number }) {
    try {
      
      const response = await api.post('/v1/marketplace-highlights-payment', {
        marketplaceItemIds: data.marketplaceItemIds
      });


      if (response.data.success && response.data.data.session) {
        const { PaymentPersistenceService } = await import('./paymentPersistence');
        
        const paymentData = {
          sessionId: response.data.data.session.sessionId,
          externalReference: response.data.data.session.external_reference,
          userId: response.data.data.session.user_id,
          itemIds: data.marketplaceItemIds,
          createdAt: new Date().toISOString(),
          expiresAt: response.data.data.session.expires_at,
          status: 'pending' as const,
          qrCode: response.data.data.qr_code,
          qrCodeBase64: response.data.data.qr_code_base64,
          ticketUrl: response.data.data.ticket_url,
          totalAmount: response.data.data.session.total_amount,
          itemsCount: response.data.data.items?.length || data.marketplaceItemIds.length
        };
        
        PaymentPersistenceService.savePendingPayment(paymentData);
      }
      
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Erro ao processar destaque do marketplace',
        errors: error.response?.data?.errors || []
      };
    }
  }

  


  async confirmMarketplaceHighlight(data: { marketplaceItemIds: string[]; durationDays?: number }) {
    try {
      const response = await api.post('/marketplace-highlights', {
        marketplaceItemIds: data.marketplaceItemIds,
        durationDays: data.durationDays || 14
      });
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Erro ao confirmar destaque do marketplace',
        errors: error.response?.data?.errors || []
      };
    }
  }

  


  async getMyHighlights(params?: {
    status?: string;
    page?: number;
    limit?: number;
  }) {
    try {
      const queryParams = new URLSearchParams();
      if (params?.status) queryParams.append('status', params.status);
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());

      const response = await api.get(`/highlights/my?${queryParams.toString()}`);
      return {
        success: true,
        data: response.data.data,
        message: 'Destaques carregados com sucesso'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Erro ao carregar destaques',
        data: { highlights: [], pagination: { page: 1, limit: 10, total: 0, pages: 0 } }
      };
    }
  }

  


  async getMyMarketplaceHighlights(params?: {
    status?: string;
    page?: number;
    limit?: number;
  }) {
    try {
      const queryParams = new URLSearchParams();
      if (params?.status) queryParams.append('status', params.status);
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());

      const response = await api.get(`/marketplace-highlights?${queryParams.toString()}`);
      return {
        success: true,
        data: response.data.data
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Erro ao buscar destaques do marketplace',
        data: { highlights: [], pagination: { total: 0, page: 1, limit: 10, pages: 0 } }
      };
    }
  }

  


  async getHighlightDetails(highlightId: string) {
    try {
      const response = await api.get(`/highlights/${highlightId}`);
      return {
        success: true,
        data: response.data.data,
        message: 'Detalhes do destaque carregados com sucesso'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Erro ao carregar detalhes do destaque'
      };
    }
  }

  


  async cancelHighlight(highlightId: string) {
    try {
      const response = await api.put(`/highlights/${highlightId}/cancel`);
      return {
        success: true,
        data: response.data.data,
        message: response.data.message || 'Destaque cancelado com sucesso'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Erro ao cancelar destaque'
      };
    }
  }

  


  async renewHighlight(highlightId: string, durationDays?: number) {
    try {
      const response = await api.post(`/highlights/${highlightId}/renew`, {
        durationDays: durationDays || 14
      });
      return {
        success: true,
        data: response.data.data,
        message: response.data.message || 'Destaque renovado com sucesso'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Erro ao renovar destaque'
      };
    }
  }

  


  async getHighlightStats(userId?: string) {
    try {
      const queryParams = new URLSearchParams();
      if (userId) queryParams.append('userId', userId);

      const response = await api.get(`/highlights/stats?${queryParams.toString()}`);
      return {
        success: true,
        data: response.data.data,
        message: 'Estatísticas carregadas com sucesso'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Erro ao carregar estatísticas',
        data: { 
          stats: {
            totalHighlights: 0,
            activeHighlights: 0,
            expiredHighlights: 0,
            totalRevenue: 0,
            averagePrice: 0
          }
        }
      };
    }
  }

  


  calculateTimeRemaining(endDate: string): {
    days: number;
    hours: number;
    minutes: number;
    isExpired: boolean;
    formattedString: string;
  } {
    const now = new Date();
    const expires = new Date(endDate);
    const diff = expires.getTime() - now.getTime();

    if (diff <= 0) {
      return {
        days: 0,
        hours: 0,
        minutes: 0,
        isExpired: true,
        formattedString: 'Expirado'
      };
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    let formattedString = '';
    if (days > 0) {
      formattedString = `${days}d ${hours}h restantes`;
    } else if (hours > 0) {
      formattedString = `${hours}h ${minutes}m restantes`;
    } else {
      formattedString = `${minutes}m restantes`;
    }

    return {
      days,
      hours,
      minutes,
      isExpired: false,
      formattedString
    };
  }

  


  isBoostingHighlighted(boosting: any): boolean {
    return boosting.detached === true && 
           boosting.highlightExpires && 
           new Date(boosting.highlightExpires) > new Date();
  }

  


  formatPrice(price: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  }

  


  getHighlightConfig() {
    return {
      HIGHLIGHT_PRICE: 10.00,
      HIGHLIGHT_DURATION_DAYS: 14,
      MAX_HIGHLIGHTS_PER_PURCHASE: 10,
      CURRENCY: 'BRL'
    };
  }
}

export const highlightService = new HighlightService();

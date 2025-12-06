import chatApi from './chatApi';

export interface OpenTicketResponse {
  success: boolean;
  message?: string;
  data?: { reportId: string };
  error?: string;
}

export type IssueType = 'service_not_delivered' | 'payment_issues' | 'other';

const supportService = {
  checkStatus: async (
    purchaseId: string
  ): Promise<{ success: boolean; data?: { exists: boolean; reportId: string | null }; message?: string }> => {
    try {
      const res = await chatApi.get(`/api/purchases/${purchaseId}/support-ticket/status`);
      return res.data;
    } catch (error: any) {
      if (error?.response?.data) return error.response.data;
      return { success: false, message: 'Erro ao verificar status do ticket' } as any;
    }
  },

  openTicket: async (
    purchaseId: string,
    params?: { description?: string; issueType?: IssueType },
    security?: { fingerprint?: string; components?: any }
  ): Promise<OpenTicketResponse> => {
    try {
      
      const status = await supportService.checkStatus(purchaseId);
      if (status?.success && status?.data?.exists) {
        return { success: false, message: 'Já existe um ticket aberto para este pedido.', data: { reportId: status.data.reportId || '' } } as any;
      }
      const res = await chatApi.post(`/api/purchases/${purchaseId}/support-ticket`, {
        ...(params || {}),
        ...(security ? { security } : {})
      });
      return res.data as OpenTicketResponse;
    } catch (error: any) {
      if (error?.response?.data) return error.response.data as OpenTicketResponse;
      return { success: false, message: 'Erro de conexão com o servidor' } as any;
    }
  },

  listTickets: async (params?: { page?: number; limit?: number; status?: string }): Promise<{
    success: boolean;
    data?: { tickets: any[]; pagination: { total: number; page: number; limit: number; pages: number } };
    message?: string;
  }> => {
    try {
      const res = await chatApi.get('/api/support/tickets', { params });
      return res.data;
    } catch (error: any) {
      if (error?.response?.data) return error.response.data;
      return { success: false, message: 'Erro ao listar tickets' } as any;
    }
  },

  getTicket: async (id: string): Promise<{
    success: boolean;
    data?: { report: any; messages: any[] };
    message?: string;
  }> => {
    try {
      const res = await chatApi.get(`/api/support/tickets/${id}`);
      return res.data;
    } catch (error: any) {
      if (error?.response?.data) return error.response.data;
      return { success: false, message: 'Erro ao carregar ticket' } as any;
    }
  }
};

export default supportService;
